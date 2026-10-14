sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function(
	Controller, JSONModel
) {
	"use strict";

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
		}
	});
});