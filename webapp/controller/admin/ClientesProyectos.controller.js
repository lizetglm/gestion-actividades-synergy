sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel"
], function(
	Controller, JSONModel
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.admin.ClientesProyectos", {
		onInit: function () {
            // Inicializa el modelo local para controlar las 3 columnas
            var oViewModel = new JSONModel({ 
                layout: "OneColumn" 
            });
            this.getView().setModel(oViewModel, "fclModel");

            // Inicializar el Router escuchando los parámetros por UUID
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteClientesProyectos").attachMatched(this._onRouteMatched, this);
            oRouter.getRoute("RouteProyectos").attachMatched(this._onRouteMatched, this);
            oRouter.getRoute("RouteRequerimientos").attachMatched(this._onRouteMatched, this);
        },
        
        _onRouteMatched: function (oEvent) {
            var sRouteName = oEvent.getParameter("name");
            var oModel = this.getView().getModel("fclModel");
            
            // Cambia dinámicamente el layout dependiendo de la ruta en la que estemos
            if (sRouteName === "RouteClientesProyectos") {
                oModel.setProperty("/layout", "OneColumn");
            } else if (sRouteName === "RouteProyectos") {
                oModel.setProperty("/layout", "TwoColumnsBeginExpanded");
            } else if (sRouteName === "RouteRequerimientos") {
                oModel.setProperty("/layout", "ThreeColumnsMidExpanded");
            }
        }
	});
});