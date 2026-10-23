sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "ns/frontend/util/ExportHelper"
], function(
    Controller, JSONModel, MessageBox, MessageToast, Filter, FilterOperator, Spreadsheet, exportLibrary,
    ExportHelper
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
            
            // Modelos solo de prueba
            var oModel = new JSONModel("model/panelCumplimiento.json");
            this.getView().setModel(oModel, "modelo");
        },

        onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteMain");
		},

        // FILTROS ---
        onFiltrarDashboard: function () {
            let sCliente = this.byId("filtroCliente").getSelectedKey();
            let sEquipo = this.byId("filtroEquipo").getSelectedKey();
            let aFilters = [];

            //filtardo de los datos 
            if (sCliente && sCliente !== "Todos") {
                aFilters.push(new Filter("cliente", FilterOperator.Contains, sCliente));
            }
            if (sEquipo && sEquipo !== "Todos") {
                aFilters.push(new Filter("equipo", FilterOperator.Contains, sEquipo));
            }

            let oTable = this.byId("tablaDashboardCumplimiento");
            let oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);  // filtros en la tabla
        },

        // KPIs DINÁMICOS ---
        onCalcularKPIs: function () {
            let oTable = this.byId("tablaCumplimiento");
            let oBinding = oTable.getBinding("items");
            
            // Si el binding aún no existe, salimos
            if (!oBinding) return;

            // getCurrentContexts() nos da solo las filas visibles (respetando los filtros)
            let aContexts = oBinding.getCurrentContexts();

            let iActivos = aContexts.length;
            let iCompletos = 0;
            let iPendientes = 0;
            let iSinFirmar = 0;

            // conteno de lp estatus iterando sobre las filas visibles
            aContexts.forEach(function (oContext) {
                let oFila = oContext.getObject();
                if (oFila.estatusReg === "Completo") iCompletos++;
                if (oFila.estatusReg === "Pendiente") iPendientes++;
                if (oFila.estatusFirma === "Sin firmar") iSinFirmar++;
            });

            // Actualizacion del modelo visual
            let oUiModel = this.getView().getModel("uiPantalla");
            oUiModel.setProperty("/kpis/activos", iActivos);
            oUiModel.setProperty("/kpis/completos", iCompletos);
            oUiModel.setProperty("/kpis/pendientes", iPendientes);
            oUiModel.setProperty("/kpis/sinFirmar", iSinFirmar);
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
	});
});