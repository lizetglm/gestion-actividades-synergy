sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(
	Controller
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.ReporteMensual", {
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onInit: function () {
            let uiEstado = {
                tituloHeader: this.getResourceBundle().getText("titleReporteMensual"),
                saludo: this.getResourceBundle().getText("saludoReporteMensual") + " " + new Date().toLocaleDateString("es-MX", {
                    month: "long",
                    year: "numeric"
                })
            };

            this.getView().setModel(new sap.ui.model.json.JSONModel(uiEstado), "uiPantalla");
        },

        onBack: function() {
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },

        onDownloadPDF: function () {
            sap.m.MessageToast.show("Descargando PDF del reporte...");
        },

        onSignReport: function () {
            sap.m.MessageToast.show("Reporte firmado y enviado a RR.HH. con éxito.");
        },

        onRequestReopen: function () {
            sap.m.MessageToast.show("Solicitud de reapertura enviada.");
        }
	});
});