sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";
  
      return BaseController.extend("ns.frontend.controller.App", {
        onInit: function () {
            var oToolPage = this.byId("app");
            if (oToolPage) {
                oToolPage.setSideExpanded(false);
            }

            // Escuchar cada cambio de ruta en la aplicación
            this.getOwnerComponent().getRouter().attachRouteMatched(this.onRouteChange, this);
        },

        onSideNavButtonPress: function () {
            var oToolPage = this.byId("app");
            var bExpanded = oToolPage.getSideExpanded();
            oToolPage.setSideExpanded(!bExpanded);
        },

        onRouteChange: function (oEvent) {
            var sRouteName = oEvent.getParameter("name"); //nombre de la ruta
            var oSideNavigation = this.byId("sideNavigation");
            var sKey = "";

            // mapeo del nombre de la rta y el key del sidemenu
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

            // sombrear el elemento seleccionado en el sidemenu
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
  