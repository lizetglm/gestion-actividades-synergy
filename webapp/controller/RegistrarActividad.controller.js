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
				saludo: "Hola, bienvenido"
			};

			this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");
		}
	});
});