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
            let uiEstado = {
                tituloHeader: this.getResourceBundle().getText("titleMain"),
                userName: "",
                saludo: "Cargando información del usuario...",
                esConsultor: false,
                esAdministrador: false,
                autenticacionFinalizada: false,
                errorAutenticacion: false

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
                    titulo: this.getResourceBundle().getText("app4"),
                    descripcion: this.getResourceBundle().getText("desc4"),
                    icono: "sap-icon://pending",
                    ruta: "RouteReporteMensual"
                },
                {
                    titulo: this.getResourceBundle().getText("app5"),
                    descripcion: this.getResourceBundle().getText("desc5"),
                    icono: "sap-icon://customer-history",
                    ruta: "RouteHistorial"
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
                    ruta: "RoutePerfiles"
                },
                {
                    titulo: this.getResourceBundle().getText("appAdmin4"),
                    descripcion: this.getResourceBundle().getText("descAdmin4"),
                    icono: "sap-icon://customize",
                    ruta: "RouteConfiguracion"
                },
                {
                    titulo: this.getResourceBundle().getText("appAdmin5"),
                    descripcion: this.getResourceBundle().getText("descAdmin5"),
                    icono: "sap-icon://complete",
                    ruta: "RouteConsolidacion"
                }
            ];

            // Agrupar todo en un solo grupo de objetos
            let apps = {
                listaConsultor: appsConsultor,
                listaAdmin: appsAdministrador
            };
                        
            // Modelo de usuario compartido con toda la aplicación
            this.getOwnerComponent().setModel(
                new JSONModel(uiEstado),
                "uiPantalla"
            );

            // Modelo de tarjetas de la pantalla principal
            this.getView().setModel(
                new JSONModel(apps),
                "apps"
            );

            this._cargarUsuarioAutenticado();

        },

        _cargarUsuarioAutenticado: async function () {
            const oUiModel = this.getOwnerComponent().getModel("uiPantalla");
            const oODataModel = this.getOwnerComponent().getModel();

            try {
                const oBinding = oODataModel.bindList(
                    "/MiUsuario",
                    undefined,
                    undefined,
                    undefined,
                    { $$groupId: "$direct" }
                );
                const aContextos = await oBinding.requestContexts(0, 2);

                if (aContextos.length !== 1) {
                    throw new Error("Usuario no registrado o acceso no autorizado");
                }

                const oUsuario = await aContextos[0].requestObject();

                const bEsAdmin =
                    oUsuario.Perfil === "ADMINISTRADOR" &&
                    oUsuario.Activo === true;

                const bEsConsultor =
                    oUsuario.Perfil === "CONSULTOR" &&
                    oUsuario.Activo === true;

                if (!bEsAdmin && !bEsConsultor) {
                    throw new Error("Perfil no autorizado");
                }

                oUiModel.setProperty("/userName", oUsuario.IdentidadSso);
                oUiModel.setProperty(
                    "/saludo",
                    "Hola, bienvenido " + oUsuario.IdentidadSso
                );

                oUiModel.setProperty("/esAdministrador", bEsAdmin);
                oUiModel.setProperty("/esConsultor", bEsConsultor);
                oUiModel.setProperty("/errorAutenticacion", false);

            } catch (oError) {
                console.error("Error al identificar al usuario:", oError);

                oUiModel.setProperty("/userName", "");
                oUiModel.setProperty("/saludo", "Acceso no autorizado");
                oUiModel.setProperty("/esAdministrador", false);
                oUiModel.setProperty("/esConsultor", false);

                oUiModel.setProperty("/errorAutenticacion", true);

                
            }
            finally {
    oUiModel.setProperty("/autenticacionFinalizada", true);
}
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

