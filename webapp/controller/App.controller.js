sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";
  
      return BaseController.extend("ns.frontend.controller.App", {
        onInit: function () {
            // El menú lateral arranca oculto por defecto para limpiar la pantalla
            var oToolPage = this.byId("app");
            if (oToolPage) {
                oToolPage.setSideExpanded(false);
            }
        },

        onSideNavButtonPress: function () {
            var oToolPage = this.byId("app");
            var bExpanded = oToolPage.getSideExpanded();
            // Alterna la apertura/cierre del menú lateral al hacer clic
            oToolPage.setSideExpanded(!bExpanded);
        },

        onNavigationSelect: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            var oRouter = this.getOwnerComponent().getRouter();

            // Cierra el menú automáticamente al seleccionar una opción para dar espacio
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
  