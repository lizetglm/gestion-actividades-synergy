sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"sap/ui/export/Spreadsheet", 
    "sap/ui/export/library"
], function(
	Controller, JSONModel, MessageToast, MessageBox, Fragment, Spreadsheet, exportLibrary
) {
	"use strict";
	const EdmType = exportLibrary.EdmType;

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

		onExportarProyectosExcel: function() {
			let aCols = [
				{ label: 'ID Proyecto', property: 'idProyecto', type: EdmType.String },
				{ label: 'Nombre del Proyecto', property: 'nombreProyecto', type: EdmType.String },
				{ label: 'Descripción', property: 'descripcion', type: EdmType.String },
				{ label: 'Estatus', property: 'estatusProyecto', type: EdmType.String }
			];

			let oRowBinding = this.byId("tablaProyectosDetalle").getBinding("items");

			let oSettings = {
				workbook: { columns: aCols },
				dataSource: oRowBinding,
				fileName: 'Portafolio_Proyectos.xlsx',
				worker: false
			};

			let oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(() => oSheet.destroy());
		},
		onExportarConsultoresExcel: function() {
			let aCols = [
				{ label: 'Nombre del Consultor', property: 'nombreConsultor', type: EdmType.String },
				{ label: 'Proyecto Asignado', property: 'proyectoAsignado', type: EdmType.String },
				{ label: 'Rol', property: 'rol', type: EdmType.String }
			];

			let oRowBinding = this.byId("tablaConsultoresDetalle").getBinding("items");

			let oSettings = {
				workbook: { columns: aCols },
				dataSource: oRowBinding,
				fileName: 'Consultores_Asignados.xlsx',
				worker: false
			};

			let oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(() => oSheet.destroy());
		},


		// PROYECTOS Y REQUERMIENTOS -----------------------------------------
		onDetalleProyecto: function (oEvent) {
			// Lógica para abrir un diálogo llamdo DetalleProyecto (falta implementar)
			let oContext = oEvent.getSource().getBindingContext("modeloClientes");
			let oView = this.getView();

			if (!this._oDialogDetalleProyecto) {
				Fragment.load({
					id: oView.getId(),
					name: "ns.frontend.fragment.DetalleProyecto",
					controller: this
				}).then(function (oDialog) {
					this._oDialogDetalleProyecto = oDialog;
					oView.addDependent(this._oDialogDetalleProyecto);
					this._oDialogDetalleProyecto.setBindingContext(oContext, "modeloClientes");
					this._oDialogDetalleProyecto.open();
				}.bind(this));
			} else {
				this._oDialogDetalleProyecto.setBindingContext(oContext, "modeloClientes");
				this._oDialogDetalleProyecto.open();
			}
		},
		onCerrarDetalleProyecto: function () {
			if (this._oDialogDetalleProyecto) {
				this._oDialogDetalleProyecto.close();
			}
		},

		onNuevoProyecto: function(oEvent) {
			// Lógica para abrir un diálogo llamdo DialogProyecto (falta implementar)

			let oView = this.getView();
			if (!this._oDialogProyecto) {
				sap.ui.core.Fragment.load({
					id: oView.getId(),
					name: "ns.frontend.fragment.DialogProyecto", 
					controller: this
				}).then(function (oDialog) {
					this._oDialogProyecto = oDialog;
					oView.addDependent(this._oDialogProyecto);
					this._oDialogProyecto.unbindElement("modeloClientes"); 
					this._oDialogProyecto.open();
				}.bind(this));
			} else {
				this._oDialogProyecto.unbindElement("modeloClientes");
				this._oDialogProyecto.open();
			}
		},

		onEditarProyecto: function(oEvent) {
			// Lógica para abrir un diálogo llamdo DialogProyecto (falta implementar)	

			let oContext = oEvent.getSource().getBindingContext("modeloClientes"); 
			let oView = this.getView();

			if (!this._oDialogProyecto) {
				sap.ui.core.Fragment.load({
					id: oView.getId(),
					name: "ns.frontend.fragment.DialogProyecto",
					controller: this
				}).then(function (oDialog) {
					this._oDialogProyecto = oDialog;
					oView.addDependent(this._oDialogProyecto);
					this._oDialogProyecto.setBindingContext(oContext, "modeloClientes");
					this._oDialogProyecto.open();
				}.bind(this));
			} else {
				this._oDialogProyecto.setBindingContext(oContext, "modeloClientes");
				this._oDialogProyecto.open();
			}
		},

		onCerrarDialogProyecto: function () {
			if (this._oDialogProyecto) {
				this._oDialogProyecto.close();
			}
		},

		onGuardarProyectoMock: function () {
			// Logica para guardar los datos del proyecto (falta implementar)

			MessageToast.show("Simulación: Proyecto guardado exitosamente.");
			this.onCerrarDialogProyecto();
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
						MessageToast.show("Simulacion:Cliente removido exitosamente.");
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


		// ASIGNACIÓN DE CONSULTORES--------------------------------------------------------
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
						MessageToast.show("Simulación: Consultor removido exitosamente.");
					}
				}.bind(this)
			});
		},

		onAsignarConsultor: function (oEvent) {
			let oView = this.getView();

			let oDatosNuevoConsultor = {
				nombreConsultor: "",
				proyectoAsignado: "",
				rol: ""
			};
			let oDialogModel = new JSONModel(oDatosNuevoConsultor);

			if (!this._oDialogConsultor) {
				sap.ui.core.Fragment.load({
					id: oView.getId(),
					name: "ns.frontend.fragment.DialogConsultor", 
					controller: this
				}).then(function (oDialog) {
					this._oDialogConsultor = oDialog;
					oView.addDependent(this._oDialogConsultor);
					this._oDialogConsultor.setModel(oDialogModel, "nuevoConsultor");
					this._oDialogConsultor.open();
				}.bind(this));
			} else {
				this._oDialogConsultor.setModel(oDialogModel, "nuevoConsultor");
				this._oDialogConsultor.open();
			}
		},

		onCerrarDialogConsultor: function () {
			if (this._oDialogConsultor) {
				this._oDialogConsultor.close();
			}
		},

		onGuardarConsultorMock: function () {
			// Logica para guardar los datos del consultor (falta implementar)
			
			sap.m.MessageToast.show("Simulación: Consultor asignado exitosamente al proyecto.");
			this.onCerrarDialogConsultor();
		}
	});
});