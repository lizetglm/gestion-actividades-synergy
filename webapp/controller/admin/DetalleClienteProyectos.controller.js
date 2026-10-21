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

			// Modelos solo de prueba
            var oModel = new JSONModel("model/detalleCliente.json");
            this.getView().setModel(oModel, "modelo");
		},

		onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteClientesProyectos");
		},

		onInactivarCliente: function(oEvent) {
			//dats del contexto
			let oControl = oEvent.getSource();
			let oContext = oControl.getBindingContext("modelo");
			let oDatosFila = oContext.getObject(); 
			let sPath = oContext.getPath(); 

			console.log("Contexto del control:", oContext);
			console.log("Datos de la fila seleccionada:", oDatosFila);

			let sNombreConsultor = oDatosFila.nombreConsultor;
			let sProyectoAsignado = oDatosFila.proyectoAsignado;
			console.log("Nombre del consultor:", sNombreConsultor);
			let sMensaje = this.getResourceBundle().getText("mensajeInactivarConsultor", [sNombreConsultor, sProyectoAsignado]);

			MessageBox.confirm(sMensaje, {
				title: this.getResourceBundle().getText("titleMsjInactivador"),
				icon: MessageBox.Icon.WARNING,
				contentWidth: "400px",
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.OK) {
						let oModel = this.getView().getModel("modelo");
						let aConsultores = oModel.getProperty("/consultores");
						
						let iIndex = parseInt(sPath.split("/").pop());
						aConsultores.splice(iIndex, 1); //eliminar el consultor del arreglo
						oModel.refresh(true);
						sap.m.MessageToast.show("Consultor removido exitosamente.");
					}
				}.bind(this)
			});
		}
	});
});