sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/ui/core/Fragment",
        "sap/m/MessageToast",
    ],
    function(BaseController, JSONModel, Fragment, MessageToast) {
      "use strict";
  
      return BaseController.extend("ns.frontend.controller.App", {
        onInit: function () {
            var oToolPage = this.byId("app");
            if (oToolPage) {
                oToolPage.setSideExpanded(false);
            }

            // Escuchar cada cambio de ruta en la aplicación
            this.getOwnerComponent().getRouter().attachRouteMatched(this.onRouteChange, this);


            // Modelos de simulacion de datos para la cabecera (luego borrar)
            var oHeaderData = {
                numeroNotificaciones: 4,
                notificaciones: [
                    {
                        titulo: "Aviso de Cierre Próximo",
                        descripcion: "Faltan 2 días hábiles para el cierre y tienes registros pendientes.",
                        fecha: "Hace 2 horas",
                        prioridad: "High"
                    },
                    {
                        titulo: "Reporte Generado",
                        descripcion: "Tu reporte de Octubre está listo para firma.",
                        fecha: "Ayer",
                        prioridad: "Medium"
                    },
                    {
                        titulo: "Nuevo Requerimiento",
                        descripcion: "Se ha agregado un nuevo requerimiento al proyecto 'Desarrollo de App Móvil'.",
                        fecha: "Hace 3 días",
                        prioridad: "Low"
                    },
                    {
                        titulo: "Actualización de Proyecto",
                        descripcion: "Se ha actualizado el estado del proyecto 'Desarrollo de App Móvil'.",
                        fecha: "Hace 1 día",
                        prioridad: "Medium"
                    }
                ]
            };
            this.getView().setModel(new JSONModel(oHeaderData), "headerModel");
        },

        // HEADER --------------------------------------------------
        // NOTIFICACIONES
        onNotificacionesPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oView = this.getView();

            if (!this._pNotificacionesPopover) {
                this._pNotificacionesPopover = Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.NotificacionesPopover",
                    controller: this
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }
            this._pNotificacionesPopover.then(function (oPopover) {
                oPopover.openBy(oButton);
            });
        },

        onCerrarNotificacion: function (oEvent) {
            let oItem = oEvent.getSource();
            let oModel = this.getView().getModel("headerModel");
            
            let sPath = oItem.getBindingContext("headerModel").getPath();
            let iIndex = parseInt(sPath.split("/").pop(), 10);
            
            // borrara del arerglo
            let aNotificaciones = oModel.getProperty("/notificaciones");
            aNotificaciones.splice(iIndex, 1);
            oModel.setProperty("/notificaciones", aNotificaciones);
            
            // actulizar contador (para que el circulito rojo cambie)
            oModel.setProperty("/numeroNotificaciones", aNotificaciones.length);
            
            MessageToast.show("Notificación descartada");
        },

        // AVATAR - SESION
        onAvatarPress: function (oEvent) {
            var oAvatar = oEvent.getSource();
            var oView = this.getView();

            if (!this._pPerfilActionSheet) {
                this._pPerfilActionSheet = Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.PerfilActionSheet",
                    controller: this
                }).then(function (oActionSheet) {
                    oView.addDependent(oActionSheet);
                    return oActionSheet;
                });
            }
            this._pPerfilActionSheet.then(function (oActionSheet) {
                oActionSheet.openBy(oAvatar);
            });
        },

        onMiPerfil: function () {
            MessageToast.show("Navegando a Mi Perfil...");
        },

        onInicio: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },

        onConfiguraciones: function () {
            this.getOwnerComponent().getRouter().navTo("RouteConfiguracion");
        },

        onCerrarSesion: function () {
            // Aquí en el futuro BTP IAS matará la sesión, por ahora solo mostramos mensaje
            MessageToast.show("Cerrando sesión SSO corporativo...");
        },


        // NAVEGACION SIDE MENU --------------------------------------------------
        onSideNavButtonPress: function () {
            var oToolPage = this.byId("app");
            var bExpanded = oToolPage.getSideExpanded();
            oToolPage.setSideExpanded(!bExpanded);
        },

        onRouteChange: function (oEvent) {
            var sRouteName = oEvent.getParameter("name"); //nombre de la ruta
            var oSideNavigation = this.byId("sideNavigation");
            var sKey = "";

            // mapeo del nombre de la rta y el key del sideMenu
            if (sRouteName === "RouteMain") {
                sKey = "home";
            } else if (sRouteName === "RouteRegistrarActividad") {
                sKey = "registrarActividad";
            } else if (sRouteName === "RouteCalendarioActividades") {
                sKey = "calendarioActividades";
            } else if (sRouteName === "RouteReporteMensual") {
                sKey = "reporteMensual";
            } else if (sRouteName === "RoutePanelCumplimiento") {
                sKey = "panelCumplimiento";
            } else if (sRouteName === "RouteClientesProyectos") {
                sKey = "clientesProyectos";
            } else if (sRouteName === "RoutePerfiles") {
                sKey = "perfiles";
            }

            // sombrear el elemento seleccionado en el sideMenu
            if (sKey && oSideNavigation) {
                oSideNavigation.setSelectedKey(sKey);
            }
        },

        onNavigationSelect: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            var oRouter = this.getOwnerComponent().getRouter();

            var oToolPage = this.byId("app");
            if (oToolPage) {
                oToolPage.setSideExpanded(false);
            }

            // Redirección de rutas
            if (sKey === "home") {
                oRouter.navTo("RouteMain");
            } else if (sKey === "registrarActividad") {
                oRouter.navTo("RouteRegistrarActividad");
            } else if(sKey === "calendarioActividades") {
                oRouter.navTo("RouteCalendarioActividades");
            } else if(sKey === "reporteMensual") {
                oRouter.navTo("RouteReporteMensual");
            } else if (sKey === "panelCumplimiento") {
                oRouter.navTo("RoutePanelCumplimiento");
            } else if (sKey === "clientesProyectos") {
                oRouter.navTo("RouteClientesProyectos");
            } else if (sKey === "perfiles") {
                oRouter.navTo("RoutePerfiles");
            }
        }
      });
    }
  );
  