sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast"
], function(
	Controller, JSONModel, MessageToast
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.admin.DetalleClienteProyectos", {
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		onInit: function () {
			let  uiEstado = {
				tituloHeader: this.getResourceBundle().getText("titleDetalleClienteProyectos"),
				saludo: this.getResourceBundle().getText("saludoPanelCumplimiento") + " " + new Date().toLocaleDateString("es-MX", {
					month: "long",
					year: "numeric"
				})
			};

			this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");
		},

		onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteClientesProyectos");
		}
	});
});