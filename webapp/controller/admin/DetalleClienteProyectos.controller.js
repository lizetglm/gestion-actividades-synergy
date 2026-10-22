sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function(
	Controller, JSONModel, MessageToast, MessageBox
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.admin.DetalleClienteProyectos", {
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		onInit: function () {
			let  uiEstado = {
				tituloHeader: this.getResourceBundle().getText("titleDetalleClienteProyectos"),
				saludo: this.getResourceBundle().getText("saludoPanelCumplimiento") + " " + new Date().toLocaleDateString("es-MX", {
					month: "long",
					year: "numeric"
				})
			};
			this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");

			//modelo de prueba
			let oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDetalleCliente").attachMatched(this._onRouteMatched, this);
		},

		_onRouteMatched: function (oEvent) {
            // Obtener el ID que pasamos en la URL desde la vista anterior
            let sClienteId = oEvent.getParameter("arguments").clienteId;
            
            // buscar en el modelo global en qué posición (índice) está este cliente
            let oModel = this.getOwnerComponent().getModel("modeloClientes");
            let aClientes = oModel.getProperty("/clientes");
            let iIndex = aClientes.findIndex(c => c.idCliente === sClienteId);

            if (iIndex !== -1) {
                // Ruta Relativa
                this.getView().bindElement({
					path: "/clientes/" + iIndex,
					model: "modeloClientes"
				});
            }
        },

		onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteClientesProyectos");
		},


		// PROYECTOS Y REQUERMIENTOS -----------------------------------------
		onDetalleProyecto: function (oEvent) {
			// Lógica para abrir un diálogo llamdo DetalleProyecto (falta implementar)
		},

		onNuevoProyecto: function(oEvent) {
			// Lógica para abrir un diálogo llamdo DialogProyecto (falta implementar)
		},

		onEditarProyecto: function(oEvent) {
			// Lógica para abrir un diálogo llamdo DialogProyecto (falta implementar)	
		},

		onInactivarProyecto: function(oEvent) {
			let oContext = oEvent.getSource().getBindingContext("modeloClientes"); 
			let oDatosFila = oContext.getObject(); 

			let sProyecto = oDatosFila.nombreProyecto;
			let sMensaje = this.getResourceBundle().getText("mensajeInactivarProyecto", [sProyecto]);

			MessageBox.confirm(sMensaje, {
				title: this.getResourceBundle().getText("titleMsjInactivador"),
				icon: MessageBox.Icon.WARNING,
				contentWidth: "400px",
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.OK) {
						//llogica para inactivar el cliente del modelo (falta implenetar)
						MessageToast.show("Cliente removido exitosamente.");
					}
				}.bind(this)
			});
		},

		// GESTIÓN DE REQUERIMIENTOS 
		onVerRequerimientos: function (oEvent) {
			// Obtener el ID del proyecto de la fila seleccionada
			let oContext = oEvent.getSource().getBindingContext("modeloClientes");
			let sIdProyecto = oContext.getProperty("idProyecto");

			this.getOwnerComponent().getRouter().navTo("RouteDetalleProyecto", {
				idProyecto: sIdProyecto
			});
		},


		// ---------CONSULTORES ASIGANDOS--------------
		onInactivarConsultor: function(oEvent) {
			let oContext = oEvent.getSource().getBindingContext("modeloClientes"); //dats del contexto
			let oDatosFila = oContext.getObject(); 

			let sNombreConsultor = oDatosFila.nombreConsultor;
			let sProyectoAsignado = oDatosFila.proyectoAsignado;
			let sMensaje = this.getResourceBundle().getText("mensajeInactivarConsultor", [sNombreConsultor, sProyectoAsignado]);

			MessageBox.confirm(sMensaje, {
				title: this.getResourceBundle().getText("titleMsjInactivador"),
				icon: MessageBox.Icon.WARNING,
				contentWidth: "400px",
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.OK) {
						//llogica para inactivar el consultor del modelo (falta implenetar)
						MessageToast.show("Consultor removido exitosamente.");
					}
				}.bind(this)
			});
		}
	});
});