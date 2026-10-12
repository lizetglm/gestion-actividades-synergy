sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
],
function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("ns.frontend.controller.Main", {
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onInit: function () {
            let  uiEstado = {
                tituloHeader: this.getResourceBundle().getText("titleMain"),
                userName: "User",
                saludo: "Hola, bienvenido"

            };

            let appsConsultor = [
                {
                    titulo: this.getResourceBundle().getText("app1"),
                    descripcion: this.getResourceBundle().getText("desc1"),
                    icono: "sap-icon://add-activity",
                    ruta: "RouteRegistrarActividad"
                },
                {
                    titulo: this.getResourceBundle().getText("app2"),
                    descripcion: this.getResourceBundle().getText("desc2"),
                    icono: "sap-icon://calendar",
                    ruta: "RouteCalendarioActividades"
                },
                {
                    titulo: this.getResourceBundle().getText("app3"),
                    descripcion: this.getResourceBundle().getText("desc3"),
                    icono: "sap-icon://course-book",
                    ruta: "RouteMain"
                },
                {
                    titulo: this.getResourceBundle().getText("app4"),
                    descripcion: this.getResourceBundle().getText("desc4"),
                    icono: "sap-icon://pending",
                    ruta: "RouteMain"
                },
                {
                    titulo: this.getResourceBundle().getText("app5"),
                    descripcion: this.getResourceBundle().getText("desc5"),
                    icono: "sap-icon://customer-history",
                    ruta: "RouteMain"
                },
                {
                    titulo: this.getResourceBundle().getText("app6"),
                    descripcion: this.getResourceBundle().getText("desc6"),
                    icono: "sap-icon://bell",
                    ruta: "RouteMain"
                }
            ];

            let appsAdministrador = [
                {
                    titulo: this.getResourceBundle().getText("appAdmin1"),
                    descripcion: this.getResourceBundle().getText("descAdmin1"),
                    icono: "sap-icon://activity-2",
                    ruta: "RoutePanelCumplimiento"
                },
                {
                    titulo: this.getResourceBundle().getText("appAdmin2"),
                    descripcion: this.getResourceBundle().getText("descAdmin2"),
                    icono: "sap-icon://company-view",
                    ruta: "RouteClientesProyectos"
                },
                {
                    titulo: this.getResourceBundle().getText("appAdmin3"),
                    descripcion: this.getResourceBundle().getText("descAdmin3"),
                    icono: "sap-icon://employee-lookup",
                    ruta: "RouteMain"
                },
                {
                    titulo: this.getResourceBundle().getText("appAdmin4"),
                    descripcion: this.getResourceBundle().getText("descAdmin4"),
                    icono: "sap-icon://customize",
                    ruta: "RouteMain"
                },
                {
                    titulo: this.getResourceBundle().getText("appAdmin5"),
                    descripcion: this.getResourceBundle().getText("descAdmin5"),
                    icono: "sap-icon://complete",
                    ruta: "RouteMain"
                }
            ];

            // Agrupar todo en un solo grupo de objetos
            let apps = {
                listaConsultor: appsConsultor,
                listaAdmin: appsAdministrador
            };
                        
            this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");
            this.getView().setModel(new JSONModel(apps), "apps");
        },

        onSaludar: function () {
            // let oUiModel = this.getView().getModel("uiMain");
            // let lecturaNombre = oUiModel.getProperty("/nombre");
            
            // let textoSaludo = this.getResourceBundle().getText("saludo",[lecturaNombre]);
            // oUiModel.setProperty("/texto", textoSaludo);
            // oUiModel.setProperty("/visible", !oUiModel.getProperty("/visible"));
        },
        
        onNavegarApp: function (oEvent) {
            let oRouter = this.getOwnerComponent().getRouter();
            let oTile = oEvent.getSource();
            let rutaDestino = oTile.getBindingContext("apps").getProperty("ruta");
            oRouter.navTo(rutaDestino);
        }
    });
});
