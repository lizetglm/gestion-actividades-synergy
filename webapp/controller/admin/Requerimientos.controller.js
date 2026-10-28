sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(
	Controller
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.admin.Requerimientos", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteRequerimientos").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function (oEvent) {
            this._sClientIndex = oEvent.getParameter("arguments").clientIndex;
            var sProjectIndex = oEvent.getParameter("arguments").projectIndex;
            
            // Conectamos la vista al proyecto exacto (ej: /clientes/0/proyectos/1)
            this.getView().bindElement({
                path: "/clientes/" + this._sClientIndex + "/proyectos/" + sProjectIndex,
                model: "mock"
            });
        },
        onCloseColumn: function () {
            this.getOwnerComponent().getRouter().navTo("RouteProyectos", {
                clientIndex: this._sClientIndex
            });
        }
	});
});