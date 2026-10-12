sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function(
	Controller, JSONModel, Filter, FilterOperator, MessageToast
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.admin.ClientesProyectos", {
		getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onInit: function () {
            let  uiEstado = {
                tituloHeader: this.getResourceBundle().getText("titleClientesProyectos"),
                saludo: this.getResourceBundle().getText("saludoPanelCumplimiento") + " " + new Date().toLocaleDateString("es-MX", {
                    month: "long",
                    year: "numeric"
                })
            };

            this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");
		},

		onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteMain");
		},

        onSearchCliente: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var aFilters = [];
        
            if (sQuery && sQuery.length > 0) {
                var oFilter = new Filter("nombre", FilterOperator.Contains, sQuery);
                aFilters.push(oFilter);
            }

            // Aplicamos el filtro a nuestra tabla
            var oTable = this.byId("tablaClientes");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);
        },

        // --- 2. Lógica para Navegar a la Subpantalla (Proyectos) ---
        onNavToProyectos: function (oEvent) {
            // Obtenemos la fila exacta a la que el usuario le dio clic
            var oItem = oEvent.getSource();
            // Obtenemos el contexto (los datos) de esa fila
            var oContext = oItem.getBindingContext("modelo");
            
            // Extraemos el ID del cliente seleccionado
            var sIdCliente = oContext.getProperty("idCliente");

            // Usamos el Router de SAPUI5 para viajar a la pantalla de detalle,
            // pasándole el ID del cliente en la URL
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("detalleCliente", {
                clienteId: sIdCliente
            });
        },

        // --- 3. Lógica del Botón "Nuevo Cliente" ---
        onNuevoCliente: function () {
            // Por ahora mostraremos un mensaje. Más adelante aquí abriremos un Dialog (Pop-up)
            MessageToast.show("Abriendo formulario para nuevo cliente...");
        }
	});
});