sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function(
	Controller, JSONModel
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.RegistrarActividad", {
		getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },
		
		onInit: function() {
			let  uiEstado = {
				tituloHeader: this.getResourceBundle().getText("titleRegistrarActividad"),
				userName: "User",
				horasTotales: this.getResourceBundle().getText("horasTotales", ["1", "0.0"]),
				esCapacitacion: false,
				saludo: this.getResourceBundle().getText("saludoRegistroActividad") + " - " + new Date().toLocaleDateString("es-MX", {
					day: "numeric",
					month: "long",
					year: "numeric"
				}),
				tableTitle: this.getResourceBundle().getText("tableActividadesHoy") + " (" + new Date().toLocaleDateString("es-MX") + ")"
			};

			this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");
		},

		onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteMain");
		}
	});
});