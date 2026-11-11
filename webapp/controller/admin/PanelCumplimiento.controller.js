sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "ns/frontend/util/ExportHelper",
    "ns/frontend/util/RapHelper"
], function (
    Controller, JSONModel, MessageBox, MessageToast, Filter, Sorter,
    Spreadsheet, exportLibrary, ExportHelper, RapHelper
) {
    "use strict";
    const EdmType = exportLibrary.EdmType;

    const GUID_VACIO = "00000000-0000-0000-0000-000000000000";
    const TEXTO_REGISTRO = { SIN: "Sin registrar", PEN: "Pendiente", COM: "Completo" };
    const TEXTO_FIRMA = { FIR: "Firmado", PEN: "Sin firmar" };

    const TITULO_KPI = {
        Activos: "Todos los consultores",
        Firmados: "Reportes firmados",
        Pendientes: "Reportes pendientes de firma",
        SinRegistro: "Consultores sin registro"
    };

    const FILAS_MIN = 3;
    const FILAS_MAX = 12;

    const num = (v) => (v != null ? parseFloat(v) : null);

    return Controller.extend("ns.frontend.controller.admin.PanelCumplimiento", {

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onInit: function () {
            this._sKpiActivo = "Activos";
            this._iPeticion = 0;
            this._sTituloBase = this.getResourceBundle().getText("detallePorConsultor");

            this.getView().setModel(new JSONModel({
                tituloHeader: this.getResourceBundle().getText("titlePanelCumplimiento"),
                saludo: "",
                kpis: { activos: 0, completos: 0, pendientes: 0, sinFirmar: 0 },
                horasTotales: 0
            }), "uiPantalla");

            this.getView().setModel(new JSONModel({
                arbol: [],
                tituloTabla: this._sTituloBase
            }), "panel");

            this._fijarPeriodoActual();

            // Clic en las tarjetas KPI (los ids de la vista se conservan)
            [
                { id: "kpiActivos", tipo: "Activos" },
                { id: "kpiCompletos", tipo: "Firmados" },
                { id: "kpiPendientes", tipo: "Pendientes" },
                { id: "kpiSinFirmar", tipo: "SinRegistro" }
            ].forEach((oKpi) => {
                this.byId(oKpi.id)?.addEventDelegate({ onclick: () => this.onKpiPress(oKpi.tipo) });
            });

            // Carga cada vez que se entra a la pantalla (en onInit el modelo aún no está disponible)
            this.getOwnerComponent().getRouter()
                .getRoute("RoutePanelCumplimiento")
                .attachPatternMatched(this._alEntrar, this);
        },

        _alEntrar: function () {
            this._cargarPanel();
        },

        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },

        _fijarPeriodoActual: function () {
            const oHoy = new Date();
            this.byId("filtroAnio").setSelectedKey(String(oHoy.getFullYear()));
            this.byId("filtroMes").setSelectedKey(String(oHoy.getMonth() + 1).padStart(2, "0"));
            this._actualizarTituloPeriodo();
        },

        // ---------- LECTURA DE DATOS ----------

        // Lee una colección (hasta 1000 filas) y la devuelve como arreglo.
        // Se usa el modelo del componente: el de la vista puede no existir todavía.
        _leer: async function (sPath, aFiltros, mParametros, aSorters) {
            const oBinding = this.getOwnerComponent().getModel().bindList(
                sPath, null, aSorters || [], aFiltros || [], mParametros || {});
            try {
                const aContextos = await oBinding.requestContexts(0, 1000);
                return aContextos.map((oCtx) => oCtx.getObject());
            } finally {
                oBinding.destroy();
            }
        },

        // Dos consultas por periodo: consultores (padres) y consultor x cliente (hijos)
        _cargarPanel: async function () {
            const iPeticion = ++this._iPeticion;
            const oTabla = this.byId("tablaCumplimiento");
            const aFiltros = [
                new Filter("Anio", "EQ", this.byId("filtroAnio").getSelectedKey()),
                new Filter("Mes", "EQ", this.byId("filtroMes").getSelectedKey())
            ];

            oTabla.setBusy(true);
            try {
                const [aConsultores, aClientes] = await Promise.all([
                    this._leer("/PanelCumplimiento", aFiltros,
                        { $select: "PeriodoUuid,ConsultorUuid,NombreConsultor,HorasRegistradas,DiasRegistrados" },
                        [new Sorter("NombreConsultor")]),
                    this._leer("/PanelCliente", aFiltros,
                        { $select: "ConsultorUuid,ClienteUuid,NombreCliente,HorasRegistradas,DiasRegistrados," +
                                   "RegistroEstado,FirmaEstado,Avance" },
                        [new Sorter("NombreCliente")])
                ]);
                if (iPeticion !== this._iPeticion) { return; }   // llegó una petición más nueva

                this._aConsultores = aConsultores;
                this._aClientes = aClientes;
                this._construirArbol();
            } catch (oError) {
                RapHelper.mostrarError(oError.message);
            } finally {
                if (iPeticion === this._iPeticion) { oTabla.setBusy(false); }
            }
        },

        // ---------- ARBOL Y KPI ----------

        _construirArbol: function () {
            const sCliente = this.byId("filtroCliente").getSelectedKey();   // "" = todos

            // Hijos: un reporte (consultor x cliente) por fila
            const mHijos = {};
            (this._aClientes || []).forEach((c) => {
                if (sCliente && c.ClienteUuid !== sCliente) { return; }
                const nHoras = num(c.HorasRegistradas);
                (mHijos[c.ConsultorUuid] = mHijos[c.ConsultorUuid] || []).push({
                    ConsultorUuid: c.ConsultorUuid,
                    ClienteUuid: c.ClienteUuid,
                    Titulo: c.NombreCliente,
                    SinCliente: c.ClienteUuid === GUID_VACIO,
                    Horas: nHoras,
                    Dias: c.DiasRegistrados,
                    Detalle: nHoras != null ? `${nHoras} h (${c.DiasRegistrados} d)` : "—",
                    RegistroEstado: c.RegistroEstado,
                    FirmaEstado: c.FirmaEstado,
                    EstatusRegistro: TEXTO_REGISTRO[c.RegistroEstado],
                    EstatusFirma: TEXTO_FIRMA[c.FirmaEstado],
                    Avance: c.Avance
                });
            });

            // Padres: el estado se deduce de sus clientes
            let aNodos = [];
            (this._aConsultores || []).forEach((f) => {
                const aHijos = mHijos[f.ConsultorUuid] || [];
                if (sCliente && !aHijos.length) { return; }   // con filtro, solo quienes tienen ese cliente

                const nFirmados = aHijos.filter((h) => h.FirmaEstado === "FIR").length;
                const nPendientes = aHijos.length - nFirmados;
                const nHoras = num(f.HorasRegistradas);

                let sRegistro = "SIN";
                if (aHijos.length) {
                    sRegistro = aHijos.every((h) => h.RegistroEstado === "COM") ? "COM" : "PEN";
                }
                let sFirma = "SIN", sTextoFirma = "—";
                if (aHijos.length) {
                    if (!nPendientes) { sFirma = "FIR"; sTextoFirma = "Firmado"; }
                    else if (!nFirmados) { sFirma = "PEN"; sTextoFirma = "Sin firmar"; }
                    else {
                        sFirma = "MIX";
                        sTextoFirma = `${nFirmados} firmado${nFirmados > 1 ? "s" : ""} · ` +
                                      `${nPendientes} pendiente${nPendientes > 1 ? "s" : ""}`;
                    }
                }

                aNodos.push({
                    ConsultorUuid: f.ConsultorUuid,
                    Titulo: f.NombreConsultor,
                    Horas: nHoras,
                    Detalle: nHoras != null ? `${nHoras} h (${f.DiasRegistrados} d)` : "0 h",
                    RegistroEstado: sRegistro,
                    FirmaEstado: sFirma,
                    EstatusRegistro: TEXTO_REGISTRO[sRegistro],
                    EstatusFirma: sTextoFirma,
                    Avance: aHijos.length
                        ? Math.round(aHijos.reduce((s, h) => s + (h.Avance || 0), 0) / aHijos.length)
                        : 0,
                    children: aHijos
                });
            });

            // KPI: antes de aplicar la tarjeta elegida, para no perder el panorama
            const nReportesFirmados = aNodos.reduce(
                (s, n) => s + n.children.filter((h) => h.FirmaEstado === "FIR").length, 0);
            const nReportes = aNodos.reduce((s, n) => s + n.children.length, 0);
            this.getView().getModel("uiPantalla").setProperty("/kpis", {
                activos: aNodos.length,
                completos: nReportesFirmados,
                pendientes: nReportes - nReportesFirmados,
                sinFirmar: aNodos.filter((n) => !n.children.length).length
            });
            this.getView().getModel("uiPantalla").setProperty("/horasTotales",
                aNodos.reduce((s, n) => s + (n.Horas || 0), 0));

            this.getView().getModel("panel").setProperty("/arbol", this._aplicarKpi(aNodos));
        },

        // La tarjeta elegida deja solo las filas que ella cuenta
        _aplicarKpi: function (aNodos) {
            const soloHijos = (fnHijo) => aNodos
                .map((n) => {
                    const aHijos = n.children.filter(fnHijo);
                    return aHijos.length ? Object.assign({}, n, { children: aHijos }) : null;
                })
                .filter(Boolean);

            switch (this._sKpiActivo) {
                case "Firmados": return soloHijos((h) => h.FirmaEstado === "FIR");
                case "Pendientes": return soloHijos((h) => h.FirmaEstado !== "FIR");
                case "SinRegistro": return aNodos.filter((n) => !n.children.length);
                default: return aNodos;
            }
        },

        // ---------- FILTROS ----------

        _actualizarTituloPeriodo: function () {
            const sMes = this.byId("filtroMes").getSelectedItem()?.getText() || "";
            const sAnio = this.byId("filtroAnio").getSelectedItem()?.getText() || "";
            this.getView().getModel("uiPantalla").setProperty("/saludo", `Periodo: ${sMes} ${sAnio}`);
        },

        _restablecerTitulo: function () {
            this._sKpiActivo = "Activos";
            this.getView().getModel("panel").setProperty("/tituloTabla", this._sTituloBase);
        },

        // Año o mes: hay que pedir datos al servidor
        onFiltroGlobalChange: function () {
            this._restablecerTitulo();
            this._actualizarTituloPeriodo();
            this._cargarPanel();
        },

        // Cliente: se filtra en memoria
        onFiltrarDashboard: function () {
            this._restablecerTitulo();
            this._construirArbol();
        },

        onKpiPress: function (sTipo) {
            this._sKpiActivo = sTipo;
            this.getView().getModel("panel").setProperty("/tituloTabla",
                sTipo === "Activos" ? this._sTituloBase : TITULO_KPI[sTipo]);
            this._construirArbol();
        },

        onResetFiltros: function () {
            this.byId("filtroCliente").setSelectedKey("");
            this.byId("filtroCliente").setValue("");
            this._fijarPeriodoActual();
            this._restablecerTitulo();
            this._cargarPanel();
            MessageToast.show("Filtros restablecidos");
        },

        // ---------- TAMAÑO DE LA TABLA ----------

        // La tabla mide lo que tiene: mínimo 3 filas, máximo 12 (luego aparece scroll interno)
        onFilasActualizadas: function () {
            const oTabla = this.byId("tablaCumplimiento");
            const iFilas = oTabla.getBinding("rows")?.getLength() || 0;
            const iVisibles = Math.min(FILAS_MAX, Math.max(FILAS_MIN, iFilas));
            if (oTabla.getVisibleRowCount() !== iVisibles) {
                oTabla.setVisibleRowCount(iVisibles);
            }
        },

        // ---------- EXPORTAR / IMPRIMIR ----------

        // Una fila por consultor y cliente (o una sola si el consultor no tiene registro)
        onExportarExcel: function () {
            const aArbol = this.getView().getModel("panel").getProperty("/arbol") || [];
            const aPlano = [];

            aArbol.forEach((n) => {
                (n.children.length ? n.children : [{}]).forEach((h) => aPlano.push({
                    Consultor: n.Titulo,
                    Cliente: h.Titulo || "—",
                    Horas: h.Titulo ? h.Horas : n.Horas,
                    Dias: h.Dias,
                    EstatusRegistro: h.Titulo ? h.EstatusRegistro : n.EstatusRegistro,
                    EstatusFirma: h.Titulo ? h.EstatusFirma : n.EstatusFirma,
                    Avance: h.Titulo ? h.Avance : n.Avance
                }));
            });

            const aCols = [
                { label: "Consultor", property: "Consultor", type: EdmType.String },
                { label: "Cliente", property: "Cliente", type: EdmType.String },
                { label: "Horas", property: "Horas", type: EdmType.Number },
                { label: "Días", property: "Dias", type: EdmType.Number },
                { label: "Estatus de registro", property: "EstatusRegistro", type: EdmType.String },
                { label: "Estatus de firma", property: "EstatusFirma", type: EdmType.String },
                { label: "Avance (%)", property: "Avance", type: EdmType.Number }
            ];

            const oSheet = new Spreadsheet({
                workbook: { columns: aCols },
                dataSource: aPlano,
                fileName: ExportHelper.generarNombreArchivoConFecha("Dashboard_Cumplimiento"),
                worker: false
            });
            oSheet.build().finally(() => oSheet.destroy());
        },

        onImprimirPantalla: function () {
            window.print();
        },

        // ---------- ACCIONES DEL PIE ----------

        onRecordatorioMasivo: function () {
            const aArbol = this.getView().getModel("panel").getProperty("/arbol") || [];
            const iPendientes = aArbol.filter(
                (n) => n.RegistroEstado !== "COM" || n.FirmaEstado !== "FIR").length;

            if (iPendientes === 0) {
                MessageBox.information("Todos los consultores visibles están al día. No hay recordatorios que enviar.");
                return;
            }

            MessageBox.confirm(`Se enviarán recordatorios a ${iPendientes} consultores con registro o firma pendiente. ¿Deseas continuar?`, {
                title: "Confirmar notificación masiva",
                onClose: (sAccion) => {
                    if (sAccion === MessageBox.Action.OK) {
                        // Pendiente: conectar con el proceso del backend (aún no envía nada)
                        MessageToast.show("Envío simulado: todavía no está conectado al backend.");
                    }
                }
            });
        },

        onConsolidar: function () {
            this.getOwnerComponent().getRouter().navTo("RouteConsolidacion");
        }
    });
});