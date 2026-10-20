sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function(
	Controller, JSONModel, Fragment, MessageToast, MessageBox
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.RegistrarActividad", {
		getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },
		
		onInit: function() {
			let  uiEstado = {
				tituloHeader: this.getResourceBundle().getText("titleRegistrarActividad"),
				userName: "User",
				horasTotales: this.getResourceBundle().getText("horasTotales", ["1", "0.0"]),
				
				fechaCaptura: new Date().toLocaleDateString("es-MX"),
				tipoActividad: "",
				horasInvertidas: "",
				esCapacitacion: false,
				cliente: "",
				proyecto: "",
				requerimiento: "",
				descripcion: "",

				saludo: this.getResourceBundle().getText("saludoRegistroActividad") + " - " + new Date().toLocaleDateString("es-MX", {
					day: "numeric",
					month: "long",
					year: "numeric"
				}),
				tableTitle: this.getResourceBundle().getText("tableActividadesHoy") + " (" + new Date().toLocaleDateString("es-MX") + ")"
			};
			this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");


			// Modelos solo de prueba
			let actividadesRegistradas = [
				{ fecha: new Date().toLocaleDateString("es-MX"), hora: "09:00", cliente: "Cliente Alpha S.A.", requerimiento: "REQ-00231", descripcion: "Desarrollo", horas: 3.5 },
           		{ fecha: new Date().toLocaleDateString("es-MX"), hora: "13:00", cliente: "Capacitación Interna", requerimiento: "SAP BTP / RAP", descripcion: "Curso Fiori", horas: 2.0 }
			];
			this.getView().setModel(new JSONModel(actividadesRegistradas), "modelo");
		},

		onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteMain");
		},

		limpiarFormulario: function() {
			let oModelUI = this.getView().getModel("uiPantalla");
			oModelUI.setProperty("/descripcion", "");
			oModelUI.setProperty("/horasInvertidas", "");
			oModelUI.setProperty("/tipoActividad", "");
			oModelUI.setProperty("/requerimiento", "");
			oModelUI.setProperty("/hora", "");
		},

		onGuardar: function(oEvent) {
			let oModelUI = this.getView().getModel("uiPantalla");
			let actividadesRegistradas = this.getView().getModel("modelo").getData();
			let formData = oModelUI.getData();
			let oClienteSelect = this.byId("clienteSelect");
    		let oProyectoSelect = this.byId("proyectoSelect");

			// SANITIZAR DATOS
            let sFechaCaptura = (formData.fechaCaptura || "").trim();
			let sTipoActividad = (formData.tipoActividad || "").trim();
			let sCliente = oClienteSelect ? (oClienteSelect.getSelectedKey() || "").trim() : "";
    		let sProyecto = oProyectoSelect ? (oProyectoSelect.getSelectedKey() || "").trim() : "";
			let sRequerimiento = (formData.requerimiento || "").trim();
            let sDescripcion = (formData.descripcion || "").trim();
            let sHoras = parseFloat(formData.horasInvertidas);

			if (sCliente === "") {
                MessageBox.error("Recuerda seleccionar el contexto del trabajo (Cliente).", {
					onClose: function () { oClienteSelect.focus(); }
				});
                return; 
            }
			if (!formData.esCapacitacion && sProyecto === "") {
                MessageBox.error("Recuerda seleccionar el contexto del trabajo (Proyecto).", {
					onClose: function () { oProyectoSelect.focus(); }
				});
                return; 
            }
			if (sFechaCaptura === "") {
				MessageBox.error("Por favor, ingresa la Fecha de captura.");
				return;
			}
			if (!sHoras || sHoras <= 0) {
				let iH = this.byId("horasInvertidasInput");
				MessageBox.error("Por favor, ingresa una cantidad de horas válida.", {
					onClose: function () { iH.focus(); }
				});
                return;
            }
			//quitar este if si no es asi el fuljo o campos especificos para capacitacion
			if (!formData.esCapacitacion) {
                // if (sTipoActividad === "") {
                //     let iTipoActividad = this.byId("tipoActividadInput");
				// 	// iTipoActividad.setValueState("Error");
				// 	// iTipoActividad.setValueStateText("El Tipo de actividad es obligatorio.");
                //     MessageBox.error("Por favor, selecciona el Tipo de actividad.", {
                //         onClose: function () { iTipoActividad.focus(); }
                //     });
                //     return;
                // }
                if (sRequerimiento === "") {
                    let iR = this.byId("requerimientoInput");
                    MessageBox.error("Por favor, ingresa el Requerimiento.", {
                        onClose: function () { iR.focus(); }
                    });
                    return;
                }
            }
			if (sDescripcion === "") {
				let iD = this.byId("descripcionInput");
				MessageBox.error("Por favor, ingresa la Descripción de la actividad.", {
					onClose: function () { iD.focus(); }
				});
				return;
			}

			// Agregar la nueva actividad al modelo
			actividadesRegistradas.push({
				fecha: sFechaCaptura,
				tipoActividad: formData.esCapacitacion ? "Capacitación Interna" : sTipoActividad,
				hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
				cliente: formData.esCapacitacion ? "Capacitación Interna" : sCliente,
				proyecto: formData.esCapacitacion ? "bench" : sProyecto,
				requerimiento: formData.esCapacitacion ? "bench" : sRequerimiento,
				descripcion: formData.descripcion,
				horas: formData.horasInvertidas
			});
			this.getView().getModel("modelo").setData(actividadesRegistradas);
			MessageToast.show("Actividad registrada exitosamente.");

			//refrescar el modelo para que la tabla se actualice
			this.getView().getModel("modelo").refresh(true);

			//actulizar el total de horas
			let totalHoras = actividadesRegistradas.reduce((total, actividad) => total + parseFloat(actividad.horas), 0);
			oModelUI.setProperty("/horasTotales", this.getResourceBundle().getText("horasTotales", [actividadesRegistradas.length, totalHoras.toFixed(1)]));
			
			// limpar formulario
            this.limpiarFormulario();
		},

		onFilaClickeada: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext("modelo");
			var oView = this.getView();

			if (!this._oDialogoDetalle) {
                Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DetalleActividad",
                    controller: this // Para que botón "Cerrar" encuentre su función aquí
                }).then(function (oDialog) {
                    this._oDialogoDetalle = oDialog;
                    
                    // conectar el diálogo a la vista (para que herede los modelos de datos)
                    oView.addDependent(this._oDialogoDetalle);
                    
                    // Pasar el contexto de la fila clickeada y abrirlo
                    this._oDialogoDetalle.setBindingContext(oContext, "modelo");
                    this._oDialogoDetalle.open();
                }.bind(this));
            } else {
                // Si ya existía de un clic anterior, solo actualizamos los datos y lo abrimos
                this._oDialogoDetalle.setBindingContext(oContext, "modelo");
                this._oDialogoDetalle.open();
            }
		},

		onCerrarDialogo: function () {
            if (this._oDialogoDetalle) {
                this._oDialogoDetalle.close();
            }
        }

	});
});