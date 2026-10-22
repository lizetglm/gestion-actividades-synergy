sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",             
    "sap/ui/model/FilterOperator"
], function(
	Controller, JSONModel, MessageToast, MessageBox, Filter, FilterOperator
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.admin.DetalleProyecto", {
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

			let oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDetalleProyecto").attachMatched(this._onRouteMatched, this);
		},

		_onRouteMatched: function (oEvent) {
            let sIdProyecto = oEvent.getParameter("arguments").idProyecto;
            
            let oModel = this.getOwnerComponent().getModel("modeloClientes");
			let aClientes = oModel.getProperty("/clientes");
			let iClienteIndex = -1;
    		let iProyectoIndex = -1;

			if (aClientes) {
				for (let i = 0; i < aClientes.length; i++) {
					let aProyectosDelCliente = aClientes[i].proyectos;
					if (aProyectosDelCliente) {
						let indexEncontrado = aProyectosDelCliente.findIndex(p => p.idProyecto === sIdProyecto);
						if (indexEncontrado !== -1) {
							iClienteIndex = i;
							iProyectoIndex = indexEncontrado;
							break; 
						}
					}
				}
			}

            if (iClienteIndex !== -1 && iProyectoIndex !== -1) {
        		let sPathProyecto = "/clientes/" + iClienteIndex + "/proyectos/" + iProyectoIndex;
				
				this.getView().bindElement({
					path: sPathProyecto,
					model: "modeloClientes"
				});
			}
        },

		onBack: function () {
            window.history.go(-1);
        },


		//  GESTIÓN DE REQUERIMIENTOS ---------
		onNuevoRequerimiento: function (oEvent) {
			let sTipo = oEvent.getSource().data("tipoReq");
			let oView = this.getView();

			let oDatosNuevoReq = {
				idRequerimiento: "",
				nombre: "",
				descripcion: "",
				estatus: "Activo",
				tipo: sTipo 
			};
			let oDialogModel = new JSONModel(oDatosNuevoReq);


			if (!this._oDialogRequerimiento) {
				sap.ui.core.Fragment.load({
					id: oView.getId(),
					name: "ns.frontend.fragment.DialogRequerimiento",
					controller: this
				}).then(function (oDialog) {
					this._oDialogRequerimiento = oDialog;
					oView.addDependent(this._oDialogRequerimiento);
					this._oDialogRequerimiento.setModel(oDialogModel, "nuevoReq");
					this._oDialogRequerimiento.open();
				}.bind(this));
			} else {
				this._oDialogRequerimiento.setModel(oDialogModel, "nuevoReq");
				this._oDialogRequerimiento.open();
			}
		},

		onCerrarDialogoReq: function () {
			if (this._oDialogRequerimiento) {
				this._oDialogRequerimiento.close();
			}
		},

		onGuardarRequerimiento: function () {
			let oDialogModel = this._oDialogRequerimiento.getModel("nuevoReq");
			let oDatosReq = oDialogModel.getData();

			if (!oDatosReq.idRequerimiento || !oDatosReq.nombre || !oDatosReq.descripcion) {
				MessageBox.warning("Por favor, llena todos los campos obligatorios.");
				return;
			}

			//LOGICA DE GUARDADO (AUN FALTA IMPLEMENTAR)
			
			MessageToast.show("Requerimiento agregado exitosamente.");
			this.onCerrarDialogoReq();
		},

		onEditRequerimiento: function (oEvent) {
			let oContext = oEvent.getSource().getBindingContext("modeloClientes");
			let oDatosReq = oContext.getObject();
			let oView = this.getView();

			let oDialogModel = new JSONModel(oDatosReq);

			if (!this._oDialogRequerimiento) {
				sap.ui.core.Fragment.load({
					id: oView.getId(),
					name: "ns.frontend.fragment.DialogRequerimiento",
					controller: this
				}).then(function (oDialog) {
					this._oDialogRequerimiento = oDialog;
					oView.addDependent(this._oDialogRequerimiento);
					this._oDialogRequerimiento.setModel(oDialogModel, "nuevoReq");
					this._oDialogRequerimiento.open();
				}.bind(this));
			} else {
				this._oDialogRequerimiento.setModel(oDialogModel, "nuevoReq");
				this._oDialogRequerimiento.open();
			}
		},

		onDeleteRequerimiento: function (oEvent) {

			MessageBox.confirm("¿Estás seguro de que deseas eliminar este requerimiento?", {
				title: "Confirmar Eliminación",
				icon: MessageBox.Icon.WARNING,
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.OK) {
						// Lógica para eliminar el requerimiento del modelo
					}
				}.bind(this)
			});
		},

		onBuscarRequerimiento: function (oEvent) {
			let sQuery = oEvent.getParameter("query");

			let oSearchField = oEvent.getSource();
			let oTable = oSearchField.getParent().getParent(); // SearchField -> OverflowToolbar -> Table
			let oBinding = oTable.getBinding("items");

			// tabla de RF o de RNF
			let sTipo = oSearchField.data("tipoTabla");

			let aFinalFilters = [];
			let oFiltroBase = new Filter("tipo", FilterOperator.EQ, sTipo);

			if (sQuery && sQuery.length > 0) {
				// coincidencias en ID, Nombre o Descripción
				let oFiltroTexto = new Filter({
					filters: [
						new Filter("idRequerimiento", FilterOperator.Contains, sQuery),
						new Filter("nombre", FilterOperator.Contains, sQuery),
						new Filter("descripcion", FilterOperator.Contains, sQuery)
					],
					and: false 
				});

				aFinalFilters.push(new Filter({
					filters: [oFiltroBase, oFiltroTexto],
					and: true
				}));
			} else {
				// Si borró la búsqueda, devolvemos la tabla a la normalidad dejando solo el filtro base
				aFinalFilters.push(oFiltroBase);
			}

			// Aplicar los filtros a la tabla correspondiente
			oBinding.filter(aFinalFilters);
		}
	});
});