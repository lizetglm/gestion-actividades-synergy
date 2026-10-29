
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "ns/frontend/util/ExportHelper",
    "sap/ui/model/Sorter"
], function(
    Controller, JSONModel, MessageBox, MessageToast, Filter, FilterOperator, Spreadsheet, exportLibrary,
    ExportHelper, Sorter
) {
	"use strict";
    const EdmType = exportLibrary.EdmType;

	return Controller.extend("ns.frontend.controller.admin.PanelCumplimiento", {
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onInit: function () {
            let  uiEstado = {
                tituloHeader: this.getResourceBundle().getText("titlePanelCumplimiento"),
                tituloTabla: this.getResourceBundle().getText("detallePorConsultor"),
                saludo: this.getResourceBundle().getText("saludoPanelCumplimiento") + " " + new Date().toLocaleDateString("es-MX", {
                    month: "long",
                    year: "numeric"
                }),
                kpis: {
                    activos: 0,
                    completos: 0,
                    pendientes: 0,
                    sinFirmar: 0
                }
            };
            this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");

            this._sKpiActivo = "Todos";
            
            // Modelos solo de prueba
            var oModel = new JSONModel("model/panelCumplimiento.json");

            //calcular KPIs al cargar el modelo
            oModel.attachRequestCompleted(function() {
                this._calcularKpisYFiltrar();
            }.bind(this));

            this.getView().setModel(oModel, "modelo"); // Modelos solo de prueba

            // ASIGNACIÓN DE EVENTOS CLIC A LOS VBOX 
            let aKpis = [
                { id: "kpiActivos", type: "Activos" },
                { id: "kpiCompletos", type: "Completos" },
                { id: "kpiPendientes", type: "Pendientes" },
                { id: "kpiSinFirmar", type: "SinFirmar" },
            ];

            aKpis.forEach(function(kpi) {
                let oVBox = this.byId(kpi.id);
                if(oVBox) {
                    oVBox.addEventDelegate({
                        onclick: function() { this.onKpiPress(kpi.type); }.bind(this)
                    });
                }
            }.bind(this));
        },

        onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteMain");
		},
        

        // ORDENAMIENTO DE TABLA 
        onAbrirOrdenamiento: function (oEvent) {
            var oView = this.getView();
            if (!this._pDialogOrdenamiento) {
                this._pDialogOrdenamiento = sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DialogOrdPanel", 
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pDialogOrdenamiento.then(function (oDialog) {
                oDialog.open();
            });
        },

        onConfirmarOrdenamiento: function (oEvent) {
            var oBinding = this.byId("tablaCumplimiento").getBinding("items");
            var mParams = oEvent.getParameters();
            oBinding.sort(new sap.ui.model.Sorter(mParams.sortItem.getKey(), mParams.sortDescending));
        },
        

        // EXPORTACIÓN Y REPORTE ---
        onExportarExcel: function () {
            let aCols = [
                { label: 'Consultor', property: 'nombre', type: EdmType.String },
                { label: 'Cliente', property: 'cliente', type: EdmType.String },
                { label: 'Equipo/Área', property: 'equipo', type: EdmType.String },
                { label: 'Estatus de Registro', property: 'estatusReg', type: EdmType.String },
                { label: 'Estatus de Firma', property: 'estatusFirma', type: EdmType.String },
                { label: 'Avance (%)', property: 'porcentajeAvance', type: EdmType.Number }
            ];

            let oRowBinding = this.byId("tablaCumplimiento").getBinding("items");
            let sNombreArchivo = ExportHelper.generarNombreArchivoConFecha("Dashboard_Cumplimiento");
            let oSettings = {
                workbook: { columns: aCols },
                dataSource: oRowBinding,
                fileName: sNombreArchivo, 
                worker: false
            };

            let oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(() => oSheet.destroy());
        },

        onImprimirPantalla: function () {
            window.print();
        },


    
        // KPIs DINÁMICOS ---
        onKpiPress: function (sKpiType) {
            this._sKpiActivo = sKpiType;
            let sTitulo = "Detalle por consultor";
            
            switch(sKpiType) {
                case 'Activos': sTitulo = "Todos los consultores activos"; break;
                case 'Completos': sTitulo = "Consultores con registro al 100%"; break;
                case 'Pendientes': sTitulo = "Consultores con días atrasados"; break;
                case 'SinFirmar': sTitulo = "Consultores con firma pendiente"; break;
            }
            this.getView().getModel("uiPantalla").setProperty("/tituloTabla", sTitulo);
            this._calcularKpisYFiltrar();
        },

        _calcularKpisYFiltrar: function () {
            let sPeriodo = this.byId("filtroPeriodo").getSelectedKey();
            
            // Calculamos los KPIs SOLO basados en el periodo
            let aTodaLaData = this.getView().getModel("modelo").getProperty("/oModelo") || [];
            let iActivos = 0, iCompletos = 0, iPendientes = 0, iSinFirmar = 0;

            aTodaLaData.forEach(oFila => {
                if (sPeriodo === "Todos" || oFila.periodo === sPeriodo) {
                    iActivos++;
                    if (oFila.estatusReg === "Completo") iCompletos++;
                    if (oFila.estatusReg === "Pendiente") iPendientes++;
                    if (oFila.estatusFirma === "Sin firmar") iSinFirmar++;
                }
            });

            let oUiModel = this.getView().getModel("uiPantalla");
            oUiModel.setProperty("/kpis/activos", iActivos);
            oUiModel.setProperty("/kpis/completos", iCompletos);
            oUiModel.setProperty("/kpis/pendientes", iPendientes);
            oUiModel.setProperty("/kpis/sinFirmar", iSinFirmar);

            this._aplicarFiltrosTabla();
        },

        // Aplica el conjunto completo de filtros (Periodo + Cliente + Equipo + KPI Activo) a la tabla
        _aplicarFiltrosTabla: function() {
            let sPeriodo = this.byId("filtroPeriodo").getSelectedKey();
            let sCliente = this.byId("filtroCliente").getSelectedKey();
            let sEquipo = this.byId("filtroEquipo").getSelectedKey();
            
            let aFiltros = [];
            
            if (sPeriodo && sPeriodo !== "Todos") aFiltros.push(new Filter("periodo", FilterOperator.EQ, sPeriodo));
            if (sCliente && sCliente !== "Todos") aFiltros.push(new Filter("cliente", FilterOperator.Contains, sCliente));
            if (sEquipo && sEquipo !== "Todos") aFiltros.push(new Filter("equipo", FilterOperator.Contains, sEquipo));
            
            if (this._sKpiActivo === 'Completos') aFiltros.push(new Filter("estatusReg", FilterOperator.EQ, "Completo"));
            if (this._sKpiActivo === 'Pendientes') aFiltros.push(new Filter("estatusReg", FilterOperator.EQ, "Pendiente"));
            if (this._sKpiActivo === 'SinFirmar') aFiltros.push(new Filter("estatusFirma", FilterOperator.EQ, "Sin firmar"));

            let oBinding = this.byId("tablaCumplimiento").getBinding("items");
            if (oBinding) {
                oBinding.filter(aFiltros);
            }
        },


        // FILTROS ---

        onFiltroGlobalChange: function (oEvent) {
            this._sKpiActivo = "Todos";
            
            // Actualizar el título ("saludo") con el texto seleccionado del ComboBox
            let sTextoMes = this.byId("filtroPeriodo").getSelectedItem().getText();
            this.getView().getModel("uiPantalla").setProperty("/saludo", "Periodo: " + sTextoMes);
            this.getView().getModel("uiPantalla").setProperty("/tituloTabla", this.getResourceBundle().getText("detallePorConsultor"));
            
            // Recalcula KPIs (basado solo en periodo)
            this._calcularKpisYFiltrar();
        },
        onFiltrarDashboard: function () {
            this._sKpiActivo = "Todos";
            this.getView().getModel("uiPantalla").setProperty("/tituloTabla", "Resultados Filtrados");
            this._aplicarFiltrosTabla();
        },

        // FOOTER
         onRecordatorioMasivo: function () {
            let oTable = this.byId("tablaCumplimiento");
            let aContexts = oTable.getBinding("items").getCurrentContexts();
            let iAtrapados = 0;

            // Recorremos la tabla filtrada en pantalla para buscar infractores
            aContexts.forEach(function(oContext) {
                let oFila = oContext.getObject();
                if (oFila.estatusReg === "Pendiente" || oFila.estatusFirma === "Sin firmar") {
                    iAtrapados++;
                }
            });

            if (iAtrapados === 0) {
                MessageBox.information("Todos los consultores visibles ya están al 100%. No hay recordatorios que enviar.");
                return;
            }

            MessageBox.confirm(`Se enviarán notificaciones push y correos a los ${iAtrapados} consultores que presentan atrasos o firmas pendientes. ¿Deseas continuar?`, {
                title: "Confirmar Notificación Masiva",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        MessageToast.show(`Notificaciones enviadas a ${iAtrapados} consultores.`);
                    }
                }
            });
        },

        onConsolidar: function () {
            this.getOwnerComponent().getRouter().navTo("RouteConsolidacion");
        },

        
	});
});