sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    MessageBox,
    MessageToast,
    History
) {
    "use strict";

    return Controller.extend(
        "ns.frontend.controller.ReporteMensual",
        {

            onInit: function () {

                const oModelo = new JSONModel({
                    ReporteUuid: "",
                    ConsultorUuid: "",
                    NombreConsultor: "",
                    Anio: "",
                    Mes: "",
                    NombreMes: "",
                    PeriodoTexto: "",
                    InformacionConsultor: "",
                    TotalHoras: 0,
                    HorasCapacitacion: 0,
                    TotalHorasTexto: "",
                    Estado: "",
                    EstadoTexto: "Consultando información",
                    EstadoColor: "None",
                    FechaGeneracion: "",
                    TienePDF: false,
                    PuedeFirmar: false,
                    PuedeSolicitarReapertura: false,
                    Actividades: [],
                    Historial: []
                });

                this.getView().setModel(
                    oModelo,
                    "reporteSeleccionado"
                );

                this._consultorUuid = "";
                this._nombreConsultor = "";

                const oRouter =
                    this.getOwnerComponent().getRouter();

                oRouter.getRoute("RouteReporteMensual")
                    .attachPatternMatched(
                        this._onRouteMatched,
                        this
                    );
            },

            _onRouteMatched: async function () {
                await this.cargarReporte();
            },
            
            // -------------------------------------

            _obtenerModeloOData: function () {

                const oComponente =
                    this.getOwnerComponent();

                return (
                    oComponente.getModel(
                        "actividadesOData"
                    ) ||
                    oComponente.getModel()
                );
            },

            _leerEntidad: async function (sEntidad, aFiltros = []) {
                const oModelo = this._obtenerModeloOData();

                const oBinding = oModelo.bindList(
                    "/" + sEntidad,
                    undefined,
                    undefined,
                    aFiltros,
                    { $$groupId: "$direct" }
                );

                const aResultados = [];

                try {
                    let iInicio = 0;
                    const iPagina = 100;

                    while (true) {
                        const aContextos =
                            await oBinding.requestContexts(
                                iInicio,
                                iPagina
                            );

                        if (!aContextos.length) {
                            break;
                        }

                        for (const oContexto of aContextos) {
                            aResultados.push(
                                await oContexto.requestObject()
                            );
                        }

                        iInicio += aContextos.length;

                        if (aContextos.length < iPagina) {
                            break;
                        }
                    }

                    return aResultados;
                } finally {
                    oBinding.destroy();
                }
            },

            _obtenerConsultor: async function () {

                const aUsuarios =
                    await this._leerEntidad(
                        "MiUsuario"
                    );

                if (!aUsuarios.length) {
                    throw new Error(
                        "El usuario SAP no está registrado " +
                        "en ZGL_T_USUARIO."
                    );
                }

                const oUsuario = aUsuarios[0];

                if (
                    oUsuario.Perfil !== "CONSULTOR" &&
                    oUsuario.Perfil !== "ADMINISTRADOR"
                ) {
                    throw new Error(
                        "El usuario no tiene un perfil válido."
                    );
                }

                if (!oUsuario.ConsultorUuid) {
                    throw new Error(
                        "El usuario no tiene un consultor asociado."
                    );
                }

                this._consultorUuid =
                    oUsuario.ConsultorUuid;

                const aConsultores =
                    await this._leerEntidad(
                        "Consultores",
                        [
                            new Filter(
                                "ConsultorUuid",
                                FilterOperator.EQ,
                                this._consultorUuid
                            )
                        ]
                    );

                this._nombreConsultor =
                    aConsultores.length
                        ? aConsultores[0].Nombre
                        : oUsuario.IdentidadSso;

                return oUsuario;
            },

            obtenerNombreMes: function (sMes) {

                const aMeses = [
                    "Enero",
                    "Febrero",
                    "Marzo",
                    "Abril",
                    "Mayo",
                    "Junio",
                    "Julio",
                    "Agosto",
                    "Septiembre",
                    "Octubre",
                    "Noviembre",
                    "Diciembre"
                ];

                return aMeses[
                    Number(sMes) - 1
                ] || "";
            },

            _formatearFecha: function (sFecha) {

                if (!sFecha) {
                    return "";
                }

                const sValor = String(sFecha);

                const aPartes =
                    sValor.split("-");

                if (aPartes.length === 3) {
                    return (
                        aPartes[2] + "/" +
                        aPartes[1] + "/" +
                        aPartes[0]
                    );
                }

                return sValor;
            },


            cargarReporte: async function () {

                const oVista = this.getView();

                const oModelo = oVista.getModel(
                    "reporteSeleccionado"
                );


                const oHoy = new Date();

                const sAnio = String(oHoy.getFullYear());

                const sMes = String(
                    oHoy.getMonth() + 1
                ).padStart(2, "0");

                // Primer día del mes actual
                const sFechaInicio = `${sAnio}-${sMes}-01`;

                // Primer día del mes siguiente (exclusivo)
                const oSiguiente = new Date(
                    Number(sAnio),
                    Number(sMes),
                    1
                );

                const sFechaFinExclusiva = [
                    oSiguiente.getFullYear(),
                    String(
                        oSiguiente.getMonth() + 1
                    ).padStart(2, "0"),
                    "01"
                ].join("-");

                const sNombreMes = this.obtenerNombreMes(sMes);

                const sPeriodo = `${sNombreMes} ${sAnio}`;

                oVista.setBusy(true);

                try {

                    await this._obtenerConsultor();

                    if (!this._consultorUuid) {
                        throw new Error(
                            "No se pudo identificar al consultor."
                        );
                    }

                    console.log(
                        "Consultor autenticado:",
                        this._consultorUuid
                    );

                    console.log(
                        "Periodo actual:",
                        sPeriodo
                    );

                    const aActividades = await this._leerEntidad(
                        "RegistrosActividad",
                        [
                            new Filter(
                                "ConsultorUuid",
                                FilterOperator.EQ,
                                this._consultorUuid
                            ),
                            new Filter(
                                "Fecha",
                                FilterOperator.GE,
                                sFechaInicio
                            ),
                            new Filter(
                                "Fecha",
                                FilterOperator.LT,
                                sFechaFinExclusiva
                            )
                        ]
                    );
                    const aActividadesMes = aActividades.filter(
                        (oActividad) => {

                            const sFecha = String(
                                oActividad.Fecha || ""
                            ).slice(0, 10);

                            return (
                                oActividad.ConsultorUuid ===
                                this._consultorUuid &&
                                sFecha >= sFechaInicio &&
                                sFecha < sFechaFinExclusiva
                            );
                        }
                    );


                    const [aClientes, aProyectos, aRequerimientos] =
                        await Promise.all([
                            this._leerEntidad("Clientes"),
                            this._leerEntidad("Proyectos"),
                            this._leerEntidad("Requerimientos")
                        ]);

                    const mClientes = new Map(
                        aClientes.map(o => [o.ClientUuid, o.Nombre])
                    );

                    const mProyectos = new Map(
                        aProyectos.map(o => [o.ProjectUuid, o.Nombre])
                    );

                    const mRequerimientos = new Map(
                        aRequerimientos.map(o => [
                            o.ReqUuid,
                            {
                                ReqId: o.ReqId,
                                Descripcion: o.Descripcion
                            }
                        ])
                    );


                    console.log(
                        "Actividades recibidas de SAP:",
                        aActividades.length
                    );

                    console.log(
                        "Actividades válidas del mes:",
                        aActividadesMes.length
                    );

                    const aReportes = await this._leerEntidad(
                        "Reportes",
                        [
                            new Filter(
                                "ConsultorUuid",
                                FilterOperator.EQ,
                                this._consultorUuid
                            ),
                            new Filter(
                                "Anio",
                                FilterOperator.EQ,
                                sAnio
                            ),
                            new Filter(
                                "Mes",
                                FilterOperator.EQ,
                                sMes
                            )
                        ]
                    );

                    const aReportesMes = aReportes.filter(
                        (oReporte) => {
                            return (
                                oReporte.ConsultorUuid ===
                                this._consultorUuid &&
                                String(oReporte.Anio) === sAnio &&
                                String(oReporte.Mes).padStart(2, "0")
                                === sMes
                            );
                        }
                    );

                    if (aReportesMes.length > 1) {
                        throw new Error(
                            "Existen reportes duplicados " +
                            "para el periodo actual."
                        );
                    }

                    const oReporte = aReportesMes[0] || null;

                    let nTotalHoras = 0;
                    let nHorasCapacitacion = 0;


                    const aFilas = aActividadesMes.map((oActividad) => {

                        const nHoras = Number(oActividad.Horas || 0);

                        nTotalHoras += nHoras;

                        const bCapacitacion =
                            oActividad.EsCapacitacion === true ||
                            oActividad.EsCapacitacion === "X";

                        if (bCapacitacion) {
                            nHorasCapacitacion += nHoras;
                        }

                        const oRequerimiento =
                            mRequerimientos.get(oActividad.ReqUuid);

                        const sCliente =
                            mClientes.get(oActividad.ClientUuid) ||
                            "Cliente no disponible";

                        const sProyecto =
                            mProyectos.get(oActividad.ProjectUuid) ||
                            "Proyecto no disponible";

                        const sRequerimiento = bCapacitacion
                            ? "Capacitación interna"
                            : (
                                oRequerimiento
                                    ? (
                                        oRequerimiento.ReqId ||
                                        oRequerimiento.Descripcion
                                    )
                                    : "Sin requerimiento"
                            );

                        return {
                            RegistroUuid: oActividad.RegistroUuid,

                            Fecha: oActividad.Fecha,

                            FechaTexto:
                                this._formatearFecha(oActividad.Fecha),

                            Cliente: sCliente,

                            Proyecto: sProyecto,

                            Requerimiento: sRequerimiento,

                            DetalleRequerimiento:
                                oRequerimiento
                                    ? oRequerimiento.Descripcion
                                    : "",

                            Descripcion:
                                oActividad.Descripcion || "",

                            Horas: nHoras,

                            HorasTexto:
                                nHoras.toFixed(2) + " h"
                        };
                    });
                    aFilas.sort((a, b) => {
                        return String(a.Fecha).localeCompare(
                            String(b.Fecha)
                        );
                    });

                    let sEstadoTexto = "Sin reporte generado";
                    let sEstadoColor = "None";

                    if (oReporte) {

                        switch (oReporte.Estado) {

                            case "BORRADOR":
                            case "P":
                                sEstadoTexto = "Borrador";
                                sEstadoColor = "Information";
                                break;

                            case "G":
                                sEstadoTexto =
                                    "Generado, pendiente de firma";
                                sEstadoColor = "Warning";
                                break;

                            default:
                                sEstadoTexto =
                                    oReporte.Estado || "Sin estado";
                                sEstadoColor = "None";
                        }
                    }

                    oModelo.setData({

                        ReporteUuid:
                            oReporte ? oReporte.ReporteUuid : "",

                        ConsultorUuid:
                            this._consultorUuid,

                        NombreConsultor:
                            this._nombreConsultor,

                        Anio: sAnio,

                        Mes: sMes,

                        NombreMes: sNombreMes,

                        PeriodoTexto: sPeriodo,

                        InformacionConsultor:
                            "Consultor: " +
                            this._nombreConsultor +
                            " | Periodo: " +
                            sPeriodo,

                        TotalHoras: nTotalHoras,

                        HorasCapacitacion:
                            nHorasCapacitacion,

                        TotalHorasTexto:
                            "Total de horas del periodo: " +
                            nTotalHoras.toFixed(2) +
                            " h | Horas de capacitación interna: " +
                            nHorasCapacitacion.toFixed(2) +
                            " h",

                        Estado:
                            oReporte ? oReporte.Estado : "",

                        EstadoTexto: sEstadoTexto,

                        EstadoColor: sEstadoColor,

                        FechaGeneracion:
                            oReporte
                                ? oReporte.FechaGeneracion
                                : "",

                        TienePDF: false,

                        PuedeFirmar: false,

                        PuedeSolicitarReapertura: false,

                        Actividades: aFilas,

                        Historial: []
                    });

                    if (oReporte && oReporte.ReporteUuid) {

                        await this._verificarPDF(
                            oReporte.ReporteUuid
                        );
                    }

                    console.log(
                        "REPORTE MENSUAL CARGADO"
                    );

                    console.log(
                        "Periodo:", sPeriodo
                    );

                    console.log(
                        "Total de actividades:",
                        aFilas.length
                    );

                    console.log(
                        "Total de horas:",
                        nTotalHoras
                    );

                    console.log(
                        "Horas de capacitación:",
                        nHorasCapacitacion
                    );

                } catch (oError) {

                    console.error(
                        "Error al cargar reporte mensual:",
                        oError
                    );

                    oModelo.setData({
                        EstadoTexto: "Error al consultar",
                        EstadoColor: "Error",
                        Actividades: [],
                        TotalHoras: 0,
                        HorasCapacitacion: 0,
                        TotalHorasTexto: "",
                        TienePDF: false,
                        PuedeFirmar: false,
                        PuedeSolicitarReapertura: false,
                        Historial: []
                    });

                    MessageBox.error(
                        oError.message ||
                        "No fue posible recuperar las actividades."
                    );

                } finally {

                    oVista.setBusy(false);
                }
            },

            _verificarPDF: async function (
                sReporteUuid
            ) {

                try {

                    const aDocumentos =
                        await this._leerEntidad(
                            "DocumentosPDF",
                            [
                                new Filter(
                                    "ReporteUuid",
                                    FilterOperator.EQ,
                                    sReporteUuid
                                )
                            ]
                        );

                    this.getView()
                        .getModel(
                            "reporteSeleccionado"
                        )
                        .setProperty(
                            "/TienePDF",
                            aDocumentos.length > 0
                        );

                } catch (oError) {

                    console.warn(
                        "No se pudo verificar el PDF:",
                        oError
                    );
                }
            },

            onDownloadPDF: async function () {

                const oModelo =
                    this.getView().getModel(
                        "reporteSeleccionado"
                    );

                const sReporteUuid =
                    oModelo.getProperty(
                        "/ReporteUuid"
                    );

                if (!sReporteUuid) {
                    MessageBox.warning(
                        "No existe un reporte mensual generado."
                    );
                    return;
                }

                try {

                    const aDocumentos =
                        await this._leerEntidad(
                            "DocumentosPDF",
                            [
                                new Filter(
                                    "ReporteUuid",
                                    FilterOperator.EQ,
                                    sReporteUuid
                                )
                            ]
                        );

                    if (!aDocumentos.length) {
                        MessageBox.warning(
                            "No existe un PDF almacenado " +
                            "para este reporte."
                        );
                        return;
                    }

                    const oDocumento = aDocumentos[0];

                    MessageBox.information(
                        "El documento existe en SAP. " +
                        "Para conservar la descarga funcional, " +
                        "debe integrarse aquí el método " +
                        "de descarga PDF que ya utilizas."
                    );

                    console.log(
                        "Documento encontrado:",
                        oDocumento
                    );

                } catch (oError) {

                    MessageBox.error(
                        "Error al consultar el documento PDF: " +
                        oError.message
                    );
                }
            },

            onSignReport: function () {

                MessageBox.information(
                    "La firma del reporte se habilitará " +
                    "cuando esté implementada la acción " +
                    "correspondiente en SAP."
                );
            },


            onRequestReopen: function () {

                MessageBox.information(
                    "La solicitud de reapertura requiere " +
                    "su correspondiente implementación " +
                    "en el backend."
                );
            },
            onBack: function () {

                const oHistory =
                    History.getInstance();

                const sHashAnterior =
                    oHistory.getPreviousHash();

                if (
                    sHashAnterior !== undefined
                ) {
                    window.history.go(-1);
                } else {
                    this.getOwnerComponent()
                        .getRouter()
                        .navTo("RouteMain");
                }
            }

        }
    );
});
