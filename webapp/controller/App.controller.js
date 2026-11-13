sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/ui/core/Fragment",
        "sap/m/MessageToast",
        "sap/m/MessageBox"
    ],
    function (BaseController, JSONModel, Fragment, MessageToast, MessageBox) {
        "use strict";

        return BaseController.extend("ns.frontend.controller.App", {
            onInit: function () {
                var oToolPage = this.byId("app");
                if (oToolPage) {
                    oToolPage.setSideExpanded(false);
                }

                // Escuchar cada cambio de ruta en la aplicación
                this.getOwnerComponent().getRouter().attachRouteMatched(this.onRouteChange, this);

                // Modelos de simulacion de datos para la cabecera
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
                let aNotificaciones = oModel.getProperty("/notificaciones");
                aNotificaciones.splice(iIndex, 1);
                oModel.setProperty("/notificaciones", aNotificaciones);
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

            // NAVEGACION SIDE MENU
            onSideNavButtonPress: function () {
                var oToolPage = this.byId("app");
                var bExpanded = oToolPage.getSideExpanded();
                oToolPage.setSideExpanded(!bExpanded);
            },

            onRouteChange: function (oEvent) {
                const sRouteName = oEvent.getParameter("name");
                const oRouter = this.getOwnerComponent().getRouter();
                const oUiModel = this.getOwnerComponent().getModel("uiPantalla");
                const oSideNavigation = this.byId("sideNavigation");

                const mRutas = {
                    RouteMain: {
                        key: "home",
                        perfil: "AMBOS"
                    },
                    RouteRegistrarActividad: {
                        key: "registrarActividad",
                        perfil: "CONSULTOR"
                    },
                    RouteCalendarioActividades: {
                        key: "calendarioActividades",
                        perfil: "CONSULTOR"
                    },
                    RouteReporteMensual: {
                        key: "reporteMensual",
                        perfil: "CONSULTOR"
                    },
                    RouteHistorial: {
                        key: "historial",
                        perfil: "CONSULTOR"
                    },
                    RoutePanelCumplimiento: {
                        key: "panelCumplimiento",
                        perfil: "ADMINISTRADOR"
                    },
                    RouteClientesProyectos: {
                        key: "clientesProyectos",
                        perfil: "ADMINISTRADOR"
                    },
                    RouteProyectos: {
                        key: "clientesProyectos",
                        perfil: "ADMINISTRADOR"
                    },
                    RouteRequerimientos: {
                        key: "clientesProyectos",
                        perfil: "ADMINISTRADOR"
                    },
                    RoutePerfiles: {
                        key: "perfiles",
                        perfil: "ADMINISTRADOR"
                    },
                    RouteConfiguracion: {
                        key: "configuracion",
                        perfil: "ADMINISTRADOR"
                    },
                    RouteConsolidacion: {
                        key: "consolidacion",
                        perfil: "ADMINISTRADOR"
                    }
                };

                const oRuta = mRutas[sRouteName];
                if (!oRuta) {
                    oRouter.navTo("RouteMain", {}, true);
                    return;
                }
                if (!oUiModel) {
                    if (sRouteName !== "RouteMain") {
                        oRouter.navTo("RouteMain", {}, true);
                    }
                    return;
                }
                const bFinalizada =
                    oUiModel.getProperty("/autenticacionFinalizada") === true;
                if (!bFinalizada) {
                    if (sRouteName !== "RouteMain") {
                        oRouter.navTo("RouteMain", {}, true);
                    }
                    return;
                }
                const bEsAdmin =
                    oUiModel.getProperty("/esAdministrador") === true;
                const bEsConsultor =
                    oUiModel.getProperty("/esConsultor") === true;
                const bAutorizado =
                    (oRuta.perfil === "AMBOS" && (bEsAdmin || bEsConsultor)) ||
                    (oRuta.perfil === "ADMINISTRADOR" && bEsAdmin) ||
                    (oRuta.perfil === "CONSULTOR" && bEsConsultor);

                if (!bAutorizado) {
                    if (sRouteName !== "RouteMain") {
                        sap.m.MessageToast.show(
                            "No tienes permisos para acceder a esta pantalla."
                        );

                        oRouter.navTo("RouteMain", {}, true);
                    }
                    return;
                }
                if (oSideNavigation) {
                    oSideNavigation.setSelectedKey(oRuta.key);
                }
            },

            onNavigationSelect: function (oEvent) {
                const sKey = oEvent.getParameter("item").getKey();
                const oRouter = this.getOwnerComponent().getRouter();
                const oUiModel = this.getOwnerComponent().getModel("uiPantalla");
                const oToolPage = this.byId("app");

                if (oToolPage) {
                    oToolPage.setSideExpanded(false);
                }

                if (!oUiModel) {
                    sap.m.MessageToast.show("Validando permisos del usuario...");
                    return;
                }

                const bEsAdmin = oUiModel.getProperty("/esAdministrador") === true;
                const bEsConsultor = oUiModel.getProperty("/esConsultor") === true;

                const mRutas = {
                    home: {
                        ruta: "RouteMain",
                        perfil: "AMBOS"
                    },
                    registrarActividad: {
                        ruta: "RouteRegistrarActividad",
                        perfil: "CONSULTOR"
                    },
                    calendarioActividades: {
                        ruta: "RouteCalendarioActividades",
                        perfil: "CONSULTOR"
                    },
                    reporteMensual: {
                        ruta: "RouteReporteMensual",
                        perfil: "CONSULTOR"
                    },
                    historial: {
                        ruta: "RouteHistorial",
                        perfil: "CONSULTOR"
                    },
                    panelCumplimiento: {
                        ruta: "RoutePanelCumplimiento",
                        perfil: "ADMINISTRADOR"
                    },
                    clientesProyectos: {
                        ruta: "RouteClientesProyectos",
                        perfil: "ADMINISTRADOR"
                    },
                    perfiles: {
                        ruta: "RoutePerfiles",
                        perfil: "ADMINISTRADOR"
                    },
                    configuracion: {
                        ruta: "RouteConfiguracion",
                        perfil: "ADMINISTRADOR"
                    },
                    consolidacion: {
                        ruta: "RouteConsolidacion",
                        perfil: "ADMINISTRADOR"
                    }
                };

                const oDestino = mRutas[sKey];

                if (!oDestino) {
                    sap.m.MessageToast.show("Opción de navegación desconocida");
                    return;
                }

                const bAutorizado =
                    (oDestino.perfil === "AMBOS" && (bEsAdmin || bEsConsultor)) ||
                    (oDestino.perfil === "ADMINISTRADOR" && bEsAdmin) ||
                    (oDestino.perfil === "CONSULTOR" && bEsConsultor);

                if (!bAutorizado) {
                    sap.m.MessageBox.error(
                        "No tienes permisos para acceder a esta función."
                    );
                    return;
                }

                oRouter.navTo(oDestino.ruta);
            },

        });
    }
);
