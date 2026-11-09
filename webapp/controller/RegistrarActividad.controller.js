sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/export/Spreadsheet", 
    "sap/ui/export/library",
	"ns/frontend/util/ExportHelper"
], function(
	Controller, JSONModel, Fragment, MessageToast, MessageBox, Spreadsheet, exportLibrary, ExportHelper
) {
	"use strict";
	const EdmType = exportLibrary.EdmType;

	return Controller.extend("ns.frontend.controller.RegistrarActividad", {
		getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },
		
				onInit: function() {
			//let sFechaHoy = new Date().toLocaleDateString("es-MX");
			let sFechaHoy = this.obtenerFechaISO(new Date());
			let  uiEstado = {
				tituloHeader: this.getResourceBundle().getText("titleRegistrarActividad"),
				userName: "User",
				horasTotales: this.getResourceBundle().getText("horasTotales", ["1", "0.0"]),
				maximoHoras: 8,
				
				fechaCaptura: sFechaHoy,
				horasInvertidas: "",
				esCapacitacion: false,
				cliente: "",
				proyecto: "",
				requerimiento: "",
				descripcion: "",

				saludo: this.getResourceBundle().getText("saludoRegistro") ,
				tableTitle: this.getResourceBundle().getText("tableActividadesHoy") + " (" + new Date().toLocaleDateString("es-MX") + ")"
			};
			this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");

			this.getView().setModel(
				new JSONModel({
					clientes: [],
					proyectos: [],
					requerimientos: []
				}),
				"catalogos"
			);
			// Modelos solo de prueba
			/*let actividadesRegistradas = [
				{ fecha: new Date().toLocaleDateString("es-MX"), hora: "09:00", cliente: "Cliente Alpha S.A.", requerimiento: "REQ-00231", descripcion: "Desarrollo", horas: 3.5 },
           		{ fecha: new Date().toLocaleDateString("es-MX"), hora: "13:00", cliente: "Capacitación Interna", requerimiento: "SAP BTP / RAP", descripcion: "Curso Fiori", horas: 2.0 }
			];*/
			this.getView().setModel(new JSONModel([]), "modelo");
			this.getView().setModel(new JSONModel([]), "modeloFiltrado");
			this.cargarCatalogos();
			this._consultorUuidPrueba = "fd027904-6eca-1fd1-b682-6e5cabd14542";

			//this.getView().setModel(new JSONModel(actividadesRegistradas), "modelo");

			// Filtrado de la tabla
			this._actualizarTablaYTotales(sFechaHoy);
			this.cargarActividades();
		},
		

		obtenerFechaISO: function (oFecha) {
			const iAnio = oFecha.getFullYear();
			const iMes = String(oFecha.getMonth() + 1).padStart(2, "0");
			const iDia = String(oFecha.getDate()).padStart(2, "0");

			return `${iAnio}-${iMes}-${iDia}`;
		},

		formatearFecha: function (sFechaISO) {
			if (!sFechaISO) {
				return "";
			}

			const aPartes = sFechaISO.split("-");

			return `${aPartes[2]}/${aPartes[1]}/${aPartes[0]}`;
		},

		
		_cargarEntidad: async function (sEntidad) {
			const oOData = this.getOwnerComponent()
				.getModel("actividadesOData");

			if (!oOData) {
				throw new Error("No existe el modelo actividadesOData");
			}

			console.log("Consultando SAP:", sEntidad);

			const oBinding = oOData.bindList("/" + sEntidad);

			const aContexts = await oBinding.requestContexts(0, 100);

			const aDatos = await Promise.all(
				aContexts.map(oContext => oContext.requestObject())
			);

			console.log("Datos recibidos de " + sEntidad + ":", aDatos);

			return aDatos;
		},

		cargarCatalogos: async function () {
			const oVista = this.getView();
			const oCatalogos = oVista.getModel("catalogos");

			try {
				const [aClientes, aProyectos, aRequerimientos] =
					await Promise.all([
						this._cargarEntidad("Clientes"),
						this._cargarEntidad("Proyectos"),
						this._cargarEntidad("Requerimientos")
					]);

				console.log("CLIENTES RAW:", aClientes);
				console.log("PROYECTOS RAW:", aProyectos);
				console.log("REQUERIMIENTOS RAW:", aRequerimientos);

				this._aClientesSAP = aClientes.map(oCliente => ({
					uuid: oCliente.ClientUuid,
					nombre: oCliente.Nombre
				}));

				this._aProyectosSAP = aProyectos.map(oProyecto => ({
					uuid: oProyecto.ProjectUuid,
					clienteUuid: oProyecto.ClientUuid,
					nombre: oProyecto.Nombre,
					activo: oProyecto.Activo
				}));

				console.table(this._aClientesSAP);
				console.table(this._aProyectosSAP);
				console.table(this._aRequerimientosSAP);

				this._aRequerimientosSAP = aRequerimientos.map(oReq => ({
					uuid: oReq.ReqUuid,
					proyectoUuid: oReq.ProjectUuid,
					clienteUuid: oReq.ClientUuid,
					nombre: oReq.Descripcion
				}));

				oCatalogos.setProperty(
					"/clientes",
					this._aClientesSAP
				);

				console.log(
					"CLIENTES EN JSONMODEL:",
					oCatalogos.getProperty("/clientes")
				);

				console.log(
					"ITEMS DEL SELECT:",
					this.byId("clienteSelect").getItems().length
				);

				oCatalogos.setProperty("/proyectos", []);
				oCatalogos.setProperty("/requerimientos", []);

				this._actualizarNombresActividades();

				console.log("Clientes:", this._aClientesSAP);
				console.log("Proyectos:", this._aProyectosSAP);
				console.log("Requerimientos:", this._aRequerimientosSAP);

			} catch (oError) {
				console.error("Error cargando catálogos:", oError);
				MessageBox.error(
					"No fue posible cargar los clientes, proyectos y requerimientos desde SAP."
				);
			}
		},

		
		onClienteChange: function (oEvent) {

			const sClienteUuid = oEvent.getSource().getSelectedKey();

			const oUI = this.getView().getModel("uiPantalla");
			const oCatalogos = this.getView().getModel("catalogos");

			oUI.setProperty("/cliente", sClienteUuid);
			oUI.setProperty("/proyecto", "");
			oUI.setProperty("/requerimiento", "");

			const aProyectos = (this._aProyectosSAP || []).filter(
				oProyecto =>
					oProyecto.clienteUuid === sClienteUuid
			);

			console.log("CLIENTE SELECCIONADO:", sClienteUuid);
			console.log("PROYECTOS DEL CLIENTE:", aProyectos);

			oCatalogos.setProperty("/proyectos", aProyectos);
			oCatalogos.setProperty("/requerimientos", []);
		},


		onProyectoChange: function (oEvent) {

			const sProyectoUuid = oEvent.getSource().getSelectedKey();

			const oUI = this.getView().getModel("uiPantalla");
			const oCatalogos = this.getView().getModel("catalogos");

			oUI.setProperty("/proyecto", sProyectoUuid);
			oUI.setProperty("/requerimiento", "");

			const aRequerimientos = (this._aRequerimientosSAP || [])
				.filter(oReq => oReq.proyectoUuid === sProyectoUuid);

			console.log("PROYECTO SELECCIONADO:", sProyectoUuid);
			console.log("REQUERIMIENTOS DEL PROYECTO:", aRequerimientos);

			oCatalogos.setProperty("/requerimientos", aRequerimientos);
		},


		_actualizarNombresActividades: function () {
			const oModelo = this.getView().getModel("modelo");
			const aActividades = oModelo.getData() || [];

			const aClientes = this._aClientesSAP || [];
			const aRequerimientos = this._aRequerimientosSAP || [];

			aActividades.forEach(oActividad => {
				const oCliente = aClientes.find(
					o => o.uuid === oActividad.ClientUuid
				);

				const oReq = aRequerimientos.find(
					o => o.uuid === oActividad.ReqUuid
				);

				oActividad.cliente = oActividad.esCapacitacion
					? "Capacitación interna"
					: (oCliente ? oCliente.nombre : oActividad.ClientUuid);

				oActividad.requerimiento = oActividad.esCapacitacion
					? "No aplica"
					: (oReq ? oReq.nombre : oActividad.ReqUuid);
			});

			oModelo.setData(aActividades);

			const sFecha = this.getView()
				.getModel("uiPantalla")
				.getProperty("/fechaCaptura");

			this._actualizarTablaYTotales(sFecha);
		},


		cargarActividades: async function () {
			const oVista = this.getView();
			const oOData = this.getOwnerComponent()
				.getModel("actividadesOData");

			try {
				oVista.setBusy(true);

				if (!oOData) {
					throw new Error("No existe el modelo actividadesOData.");
				}

				const oBinding = oOData.bindList(
					"/RegistrosActividad",
					undefined,
					undefined,
					undefined,
					{
						$select:
							"RegistroUuid,ConsultorUuid,ClientUuid," +
							"ProjectUuid,ReqUuid,EsCapacitacion," +
							"Fecha,Horas,Descripcion"
					}
				);

				// Recupera todos los registros, incluso si
				// superan el tamaño de página del servicio.
				const aContexts = await oBinding.requestContexts(0, 100);

				const aActividades = await Promise.all(
					aContexts.map(oContext => oContext.requestObject())
				);

				const aFormateadas = aActividades.map(oActividad => ({
					RegistroUuid: oActividad.RegistroUuid,
					ConsultorUuid: oActividad.ConsultorUuid,
					ClientUuid: oActividad.ClientUuid,
					ProjectUuid: oActividad.ProjectUuid,
					ReqUuid: oActividad.ReqUuid,
					esCapacitacion: oActividad.EsCapacitacion,
					fechaISO: oActividad.Fecha,
					fecha: this.formatearFecha(oActividad.Fecha),
					cliente: oActividad.EsCapacitacion
						? "Capacitación interna"
						: oActividad.ClientUuid,
					requerimiento: oActividad.ReqUuid,
					descripcion: oActividad.Descripcion,
					horas: Number(oActividad.Horas)
				}));

				oVista.getModel("modelo").setData(aFormateadas);
				this._actualizarNombresActividades();

				const sFecha = oVista.getModel("uiPantalla")
					.getProperty("/fechaCaptura");

				this._actualizarTablaYTotales(sFecha);

			} catch (oError) {
				console.error("Error al recuperar actividades:", oError);

				MessageBox.error(
					"No fue posible recuperar las actividades desde SAP."
				);
			} finally {
				oVista.setBusy(false);
			}
		},

		

		_guardarActividadSAP: async function (oNuevaActividad) {

			const oOData = this.getOwnerComponent()
				.getModel("actividadesOData");

			if (!oOData) {
				MessageBox.error("No existe el modelo actividadesOData.");
				return;
			}

			console.log("DATOS QUE SE ENVIARÁN A SAP:", oNuevaActividad);

			try {
				const oBinding = oOData.bindList(
					"/RegistrosActividad",
					undefined,
					undefined,
					undefined,
					{
						$$updateGroupId: "$direct"
					}
				);

				console.log("Iniciando creación en SAP...");

				const oContexto = oBinding.create(oNuevaActividad);

				await oContexto.created();

				console.log(
					"REGISTRO CREADO EN SAP:",
					await oContexto.requestObject()
				);

				await this.cargarActividades();

				this._limpiarFormulario();

				MessageToast.show(
					"Actividad guardada correctamente en SAP."
				);

			} catch (oError) {

				console.error("ERROR COMPLETO AL GUARDAR:", oError);

				MessageBox.error(
					"SAP no confirmó el guardado. " +
					(oError.message || "Consulta la consola F12.")
				);
			}
		},

		onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteMain");
		},

/*onFechaChange: function(oEvent) {
			let oDatePicker = oEvent.getSource();
			let oSelectedDate = oDatePicker.getDateValue();
			
			if (oSelectedDate) {
				let sFechaFormateada = oSelectedDate.toLocaleDateString("es-MX");
				this.getView().getModel("uiPantalla").setProperty("/fechaCaptura", sFechaFormateada);
				this._actualizarTablaYTotales(sFechaFormateada);
			}
		},*/
		onFechaChange: function (oEvent) {
			const sFecha = oEvent.getSource().getValue();

			this.getView()
				.getModel("uiPantalla")
				.setProperty("/fechaCaptura", sFecha);

			this._actualizarTablaYTotales(sFecha);
		},

		_actualizarTablaYTotales: function(sFecha) {
            let aTodas = this.getView().getModel("modelo").getData() || [];
            //let aFiltradas = aTodas.filter(act => act.fecha === sFecha);
			let aFiltradas = aTodas.filter(
				act => act.fechaISO === sFecha
			);
            // Actualizar modelo de la tabla filtrada
            this.getView().setModel(new JSONModel(aFiltradas), "modeloFiltrado");
			this.getView().getModel("modeloFiltrado").refresh(true);

            // Calcular total de horas del día
            let fTotal = aFiltradas.reduce((acc, curr) => acc + parseFloat(curr.horas || 0), 0);
            let oModelUI = this.getView().getModel("uiPantalla");
			
            oModelUI.setProperty("/horasTotales", this.getResourceBundle().getText("horasTotales", [sFecha, fTotal.toFixed(1)]));
			oModelUI.setProperty("/tableTitle", this.getResourceBundle().getText("tableActividadesHoy") + " (" + sFecha + ")");
        },

		_limpiarFormulario: function() {
			let oModelUI = this.getView().getModel("uiPantalla");
			oModelUI.setProperty("/horasInvertidas", "");
			oModelUI.setProperty("/descripcion", "");
			oModelUI.setProperty("/requerimiento", "");
			oModelUI.setProperty("/hora", "");
		},

		onGuardar: function(oEvent) {
			let oModelUI = this.getView().getModel("uiPantalla");
			let formData = oModelUI.getData();
			let oClienteSelect = this.byId("clienteSelect");
    		let oProyectoSelect = this.byId("proyectoSelect");
			let oReq = this.byId("requerimientoSelect");
			

			// SANITIZAR DATOS
            let sFechaCaptura = (formData.fechaCaptura || "").trim();
			let sCliente = oClienteSelect ? (oClienteSelect.getSelectedKey() || "").trim() : "";
    		let sProyecto = oProyectoSelect ? (oProyectoSelect.getSelectedKey() || "").trim() : "";
			let sRequerimiento = oReq ? (oReq.getSelectedKey() || "").trim() : "";
            let sDescripcion = (formData.descripcion || "").trim();
            let sHoras = parseFloat(formData.horasInvertidas);

			if (!formData.esCapacitacion && sCliente === "") {
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
			if (!formData.esCapacitacion && sRequerimiento === "") {
                if (sRequerimiento === "") {
                    MessageBox.error("Por favor, ingresa el Requerimiento.", {
                        onClose: function () { oReq.focus(); }
                    });
                    return;
                }
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
			if (sDescripcion === "") {
				let iD = this.byId("descripcionInput");
				MessageBox.error("Por favor, ingresa la Descripción de la actividad.", {
					onClose: function () { iD.focus(); }
				});
				return;
			}

			// VALIDACION DE HORAS
            let aTodas = this.getView().getModel("modelo").getData() || [];
			let aFiltradas = aTodas.filter(
				act => act.fechaISO === sFechaCaptura
			);
			let fTotal = aFiltradas.reduce((acc, curr) => acc + parseFloat(curr.horas || 0), 0);
            
            if (fTotal + sHoras > formData.maximoHoras) {
                MessageBox.error( this.getResourceBundle().getText("msjErrorHoras", [formData.maximoHoras, (fTotal + sHoras)]), {
                        title: "Límite de horas excedido",
						contentWidth: "400px",
						onClose: function () {
							let iH = this.byId("horasInvertidasInput");
							iH.focus();
						}.bind(this)
				});
				return; 
            }

            
			const oNuevaActividad = {
				ConsultorUuid: this._consultorUuidPrueba,

				ClientUuid: formData.esCapacitacion
					? null
					: sCliente,

				ProjectUuid: formData.esCapacitacion
					? null
					: sProyecto,

				ReqUuid: formData.esCapacitacion
					? null
					: sRequerimiento,

				EsCapacitacion: Boolean(formData.esCapacitacion),

				Fecha: sFechaCaptura,

				Horas: sHoras.toFixed(2),

				Descripcion: sDescripcion
			};

			console.log(
				"PAYLOAD REGISTRO:",
				JSON.stringify(oNuevaActividad, null, 2)
			);

			this._guardarActividadSAP(oNuevaActividad);
        },
        
        _guardarDatosModelo: function(sFechaCaptura, sCliente, sProyecto, sRequerimiento, sDescripcion, sHoras, formData) {
            let actividadesRegistradas = this.getView().getModel("modelo").getData();

			// Agregar actividad al modelo
			actividadesRegistradas.push({
				fecha: sFechaCaptura,
				hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
				cliente: sCliente,
				proyecto: formData.esCapacitacion ? "Capacitación Interna" : sProyecto,
				requerimiento: formData.esCapacitacion ? "bench" : sRequerimiento,
				descripcion: formData.descripcion,
				horas: formData.horasInvertidas,
				esCapacitacion: formData.esCapacitacion
			});

            this.getView().getModel("modelo").setData(actividadesRegistradas);
            MessageToast.show("Actividad registrada exitosamente.");

            // Actualizar vista filtrada de la tabla y recalcular totales visuales
            this._actualizarTablaYTotales(sFechaCaptura);

            this._limpiarFormulario();
		},

		onEliminarActividad: function (oEvent) {
            let oButton = oEvent.getSource();
            let oContext = oButton.getBindingContext("modeloFiltrado");
            let oActividadAEliminar = oContext.getObject();

            MessageBox.confirm("¿Estás seguro de que deseas eliminar este registro?", {
                title: "Confirmar eliminación",
				icon: MessageBox.Icon.WARNING,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        let aTodas = this.getView().getModel("modelo").getData();
                        
						let iIndex = aTodas.findIndex(act => 
                            act.hora === oActividadAEliminar.hora && 
                            act.descripcion === oActividadAEliminar.descripcion
                        );

                        if (iIndex !== -1) {
                            aTodas.splice(iIndex, 1); // Elimina el elemento del arreglo
                            this.getView().getModel("modelo").setData(aTodas);
                            
                            // Recalcular la tabla filtrada y los totales
                            this._actualizarTablaYTotales(oActividadAEliminar.fecha);
                            MessageToast.show("Actividad eliminada correctamente.");
                        }
                    }
                }.bind(this)
            });
        },

        onEditarActividad: function (oEvent) {
            let oButton = oEvent.getSource();
            let oContext = oButton.getBindingContext("modeloFiltrado");
            
            let oActividadClonada = Object.assign({}, oContext.getObject()); 
            
            // modelo para el dialogo de edición
            this.getView().setModel(new JSONModel(oActividadClonada), "modeloEdicion");

            if (!this._oDialogoEdicion) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "ns.frontend.fragment.DialogEditarActividad",
                    controller: this
                }).then(function (oDialog) {
                    this._oDialogoEdicion = oDialog;
                    this.getView().addDependent(this._oDialogoEdicion);
                    this._oDialogoEdicion.open();
                }.bind(this));
            } else {
                this._oDialogoEdicion.open();
            }
        },

        onCerrarDialogoEdicion: function () {
            if (this._oDialogoEdicion) {
                this._oDialogoEdicion.close();
            }
        },

        onGuardarEdicionSimulada: function () {
            let oDatosEditados = this.getView().getModel("modeloEdicion").getData();
            let aActividades = this.getView().getModel("modelo").getData();
            let iIndex = aActividades.findIndex(act => act.hora === oDatosEditados.hora && act.fecha === oDatosEditados.fecha);
            
            if (iIndex !== -1) {
                aActividades[iIndex].cliente = oDatosEditados.cliente;
                aActividades[iIndex].horas = oDatosEditados.horas;
                aActividades[iIndex].descripcion = oDatosEditados.descripcion;
                
                if (!aActividades[iIndex].esCapacitacion) {
                    aActividades[iIndex].proyecto = oDatosEditados.proyecto;
                    aActividades[iIndex].requerimiento = oDatosEditados.requerimiento;
                }
                
                this.getView().getModel("modelo").setData(aActividades);
            
                this._actualizarTablaYTotales(oDatosEditados.fecha); 
                
                MessageToast.show("Actividad actualizada correctamente.");
            }
            
            this.onCerrarDialogoEdicion();
        },

		onFilaClickeada: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext("modeloFiltrado");
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
                    this._oDialogoDetalle.setBindingContext(oContext, "modeloFiltrado");
                    this._oDialogoDetalle.open();
                }.bind(this));
            } else {
                this._oDialogoDetalle.setBindingContext(oContext, "modeloFiltrado");
                this._oDialogoDetalle.open();
            }
		},

		onCerrarDialogo: function () {
            if (this._oDialogoDetalle) {
                this._oDialogoDetalle.close();
            }
        },

		onExportarExcel: function() {
			let aCols = [
				{ label: 'Fecha', property: 'fecha', type: EdmType.Date, format: 'yyyy-mm-dd' },
				{ label: 'Hora', property: 'hora', type: EdmType.String },
				{ label: 'Cliente', property: 'cliente', type: EdmType.String },
				{ label: 'Requerimiento', property: 'requerimiento', type: EdmType.String },
				{ label: 'Descripción', property: 'descripcion', type: EdmType.String },
				{ label: 'Horas Registradas', property: 'horas', type: EdmType.Number }
			];

			let oRowBinding = this.byId("tablaActividades").getBinding("items");
			let sNombreArchivo = ExportHelper.generarNombreArchivoConFecha("Registro_Actividades");
            let oSettings = {
                workbook: { columns: aCols },
                dataSource: oRowBinding,
                fileName: sNombreArchivo, 
                worker: false
            };

			let oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(() => oSheet.destroy());
		}



	});
});
sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/export/Spreadsheet", 
    "sap/ui/export/library",
	"ns/frontend/util/ExportHelper"
], function(
	Controller, JSONModel, Fragment, MessageToast, MessageBox, Spreadsheet, exportLibrary, ExportHelper
) {
	"use strict";
	const EdmType = exportLibrary.EdmType;

	return Controller.extend("ns.frontend.controller.RegistrarActividad", {
		getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },
		
				onInit: function() {
			//let sFechaHoy = new Date().toLocaleDateString("es-MX");
			let sFechaHoy = this.obtenerFechaISO(new Date());
			let  uiEstado = {
				tituloHeader: this.getResourceBundle().getText("titleRegistrarActividad"),
				userName: "User",
				horasTotales: this.getResourceBundle().getText("horasTotales", ["1", "0.0"]),
				maximoHoras: 8,
				
				fechaCaptura: sFechaHoy,
				horasInvertidas: "",
				esCapacitacion: false,
				cliente: "",
				proyecto: "",
				requerimiento: "",
				descripcion: "",

				saludo: this.getResourceBundle().getText("saludoRegistro") ,
				tableTitle: this.getResourceBundle().getText("tableActividadesHoy") + " (" + new Date().toLocaleDateString("es-MX") + ")"
			};
			this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");

			this.getView().setModel(
				new JSONModel({
					clientes: [],
					proyectos: [],
					requerimientos: []
				}),
				"catalogos"
			);
			// Modelos solo de prueba
			/*let actividadesRegistradas = [
				{ fecha: new Date().toLocaleDateString("es-MX"), hora: "09:00", cliente: "Cliente Alpha S.A.", requerimiento: "REQ-00231", descripcion: "Desarrollo", horas: 3.5 },
           		{ fecha: new Date().toLocaleDateString("es-MX"), hora: "13:00", cliente: "Capacitación Interna", requerimiento: "SAP BTP / RAP", descripcion: "Curso Fiori", horas: 2.0 }
			];*/
			this.getView().setModel(new JSONModel([]), "modelo");
			this.getView().setModel(new JSONModel([]), "modeloFiltrado");
			this.cargarCatalogos();
			this._consultorUuidPrueba = "fd027904-6eca-1fd1-b682-6e5cabd14542";

			//this.getView().setModel(new JSONModel(actividadesRegistradas), "modelo");

			// Filtrado de la tabla
			this._actualizarTablaYTotales(sFechaHoy);
			this.cargarActividades();
		},
		

		obtenerFechaISO: function (oFecha) {
			const iAnio = oFecha.getFullYear();
			const iMes = String(oFecha.getMonth() + 1).padStart(2, "0");
			const iDia = String(oFecha.getDate()).padStart(2, "0");

			return `${iAnio}-${iMes}-${iDia}`;
		},

		formatearFecha: function (sFechaISO) {
			if (!sFechaISO) {
				return "";
			}

			const aPartes = sFechaISO.split("-");

			return `${aPartes[2]}/${aPartes[1]}/${aPartes[0]}`;
		},

		
		_cargarEntidad: async function (sEntidad) {
			const oOData = this.getOwnerComponent()
				.getModel("actividadesOData");

			if (!oOData) {
				throw new Error("No existe el modelo actividadesOData");
			}

			console.log("Consultando SAP:", sEntidad);

			const oBinding = oOData.bindList("/" + sEntidad);

			const aContexts = await oBinding.requestContexts(0, 100);

			const aDatos = await Promise.all(
				aContexts.map(oContext => oContext.requestObject())
			);

			console.log("Datos recibidos de " + sEntidad + ":", aDatos);

			return aDatos;
		},

		cargarCatalogos: async function () {
			const oVista = this.getView();
			const oCatalogos = oVista.getModel("catalogos");

			try {
				const [aClientes, aProyectos, aRequerimientos] =
					await Promise.all([
						this._cargarEntidad("Clientes"),
						this._cargarEntidad("Proyectos"),
						this._cargarEntidad("Requerimientos")
					]);

				console.log("CLIENTES RAW:", aClientes);
				console.log("PROYECTOS RAW:", aProyectos);
				console.log("REQUERIMIENTOS RAW:", aRequerimientos);

				this._aClientesSAP = aClientes.map(oCliente => ({
					uuid: oCliente.ClientUuid,
					nombre: oCliente.Nombre
				}));

				this._aProyectosSAP = aProyectos.map(oProyecto => ({
					uuid: oProyecto.ProjectUuid,
					clienteUuid: oProyecto.ClientUuid,
					nombre: oProyecto.Nombre,
					activo: oProyecto.Activo
				}));

				console.table(this._aClientesSAP);
				console.table(this._aProyectosSAP);
				console.table(this._aRequerimientosSAP);

				this._aRequerimientosSAP = aRequerimientos.map(oReq => ({
					uuid: oReq.ReqUuid,
					proyectoUuid: oReq.ProjectUuid,
					clienteUuid: oReq.ClientUuid,
					nombre: oReq.Descripcion
				}));

				oCatalogos.setProperty(
					"/clientes",
					this._aClientesSAP
				);

				console.log(
					"CLIENTES EN JSONMODEL:",
					oCatalogos.getProperty("/clientes")
				);

				console.log(
					"ITEMS DEL SELECT:",
					this.byId("clienteSelect").getItems().length
				);

				oCatalogos.setProperty("/proyectos", []);
				oCatalogos.setProperty("/requerimientos", []);

				this._actualizarNombresActividades();

				console.log("Clientes:", this._aClientesSAP);
				console.log("Proyectos:", this._aProyectosSAP);
				console.log("Requerimientos:", this._aRequerimientosSAP);

			} catch (oError) {
				console.error("Error cargando catálogos:", oError);
				MessageBox.error(
					"No fue posible cargar los clientes, proyectos y requerimientos desde SAP."
				);
			}
		},

		
		onClienteChange: function (oEvent) {

			const sClienteUuid = oEvent.getSource().getSelectedKey();

			const oUI = this.getView().getModel("uiPantalla");
			const oCatalogos = this.getView().getModel("catalogos");

			oUI.setProperty("/cliente", sClienteUuid);
			oUI.setProperty("/proyecto", "");
			oUI.setProperty("/requerimiento", "");

			const aProyectos = (this._aProyectosSAP || []).filter(
				oProyecto =>
					oProyecto.clienteUuid === sClienteUuid
			);

			console.log("CLIENTE SELECCIONADO:", sClienteUuid);
			console.log("PROYECTOS DEL CLIENTE:", aProyectos);

			oCatalogos.setProperty("/proyectos", aProyectos);
			oCatalogos.setProperty("/requerimientos", []);
		},


		onProyectoChange: function (oEvent) {

			const sProyectoUuid = oEvent.getSource().getSelectedKey();

			const oUI = this.getView().getModel("uiPantalla");
			const oCatalogos = this.getView().getModel("catalogos");

			oUI.setProperty("/proyecto", sProyectoUuid);
			oUI.setProperty("/requerimiento", "");

			const aRequerimientos = (this._aRequerimientosSAP || [])
				.filter(oReq => oReq.proyectoUuid === sProyectoUuid);

			console.log("PROYECTO SELECCIONADO:", sProyectoUuid);
			console.log("REQUERIMIENTOS DEL PROYECTO:", aRequerimientos);

			oCatalogos.setProperty("/requerimientos", aRequerimientos);
		},


		_actualizarNombresActividades: function () {
			const oModelo = this.getView().getModel("modelo");
			const aActividades = oModelo.getData() || [];

			const aClientes = this._aClientesSAP || [];
			const aRequerimientos = this._aRequerimientosSAP || [];

			aActividades.forEach(oActividad => {
				const oCliente = aClientes.find(
					o => o.uuid === oActividad.ClientUuid
				);

				const oReq = aRequerimientos.find(
					o => o.uuid === oActividad.ReqUuid
				);

				oActividad.cliente = oActividad.esCapacitacion
					? "Capacitación interna"
					: (oCliente ? oCliente.nombre : oActividad.ClientUuid);

				oActividad.requerimiento = oActividad.esCapacitacion
					? "No aplica"
					: (oReq ? oReq.nombre : oActividad.ReqUuid);
			});

			oModelo.setData(aActividades);

			const sFecha = this.getView()
				.getModel("uiPantalla")
				.getProperty("/fechaCaptura");

			this._actualizarTablaYTotales(sFecha);
		},


		cargarActividades: async function () {
			const oVista = this.getView();
			const oOData = this.getOwnerComponent()
				.getModel("actividadesOData");

			try {
				oVista.setBusy(true);

				if (!oOData) {
					throw new Error("No existe el modelo actividadesOData.");
				}

				const oBinding = oOData.bindList(
					"/RegistrosActividad",
					undefined,
					undefined,
					undefined,
					{
						$select:
							"RegistroUuid,ConsultorUuid,ClientUuid," +
							"ProjectUuid,ReqUuid,EsCapacitacion," +
							"Fecha,Horas,Descripcion"
					}
				);

				// Recupera todos los registros, incluso si
				// superan el tamaño de página del servicio.
				const aContexts = await oBinding.requestContexts(0, 100);

				const aActividades = await Promise.all(
					aContexts.map(oContext => oContext.requestObject())
				);

				const aFormateadas = aActividades.map(oActividad => ({
					RegistroUuid: oActividad.RegistroUuid,
					ConsultorUuid: oActividad.ConsultorUuid,
					ClientUuid: oActividad.ClientUuid,
					ProjectUuid: oActividad.ProjectUuid,
					ReqUuid: oActividad.ReqUuid,
					esCapacitacion: oActividad.EsCapacitacion,
					fechaISO: oActividad.Fecha,
					fecha: this.formatearFecha(oActividad.Fecha),
					cliente: oActividad.EsCapacitacion
						? "Capacitación interna"
						: oActividad.ClientUuid,
					requerimiento: oActividad.ReqUuid,
					descripcion: oActividad.Descripcion,
					horas: Number(oActividad.Horas)
				}));

				oVista.getModel("modelo").setData(aFormateadas);
				this._actualizarNombresActividades();

				const sFecha = oVista.getModel("uiPantalla")
					.getProperty("/fechaCaptura");

				this._actualizarTablaYTotales(sFecha);

			} catch (oError) {
				console.error("Error al recuperar actividades:", oError);

				MessageBox.error(
					"No fue posible recuperar las actividades desde SAP."
				);
			} finally {
				oVista.setBusy(false);
			}
		},

		

		_guardarActividadSAP: async function (oNuevaActividad) {

			const oOData = this.getOwnerComponent()
				.getModel("actividadesOData");

			if (!oOData) {
				MessageBox.error("No existe el modelo actividadesOData.");
				return;
			}

			console.log("DATOS QUE SE ENVIARÁN A SAP:", oNuevaActividad);

			try {
				const oBinding = oOData.bindList(
					"/RegistrosActividad",
					undefined,
					undefined,
					undefined,
					{
						$$updateGroupId: "$direct"
					}
				);

				console.log("Iniciando creación en SAP...");

				const oContexto = oBinding.create(oNuevaActividad);

				await oContexto.created();

				console.log(
					"REGISTRO CREADO EN SAP:",
					await oContexto.requestObject()
				);

				await this.cargarActividades();

				this._limpiarFormulario();

				MessageToast.show(
					"Actividad guardada correctamente en SAP."
				);

			} catch (oError) {

				console.error("ERROR COMPLETO AL GUARDAR:", oError);

				MessageBox.error(
					"SAP no confirmó el guardado. " +
					(oError.message || "Consulta la consola F12.")
				);
			}
		},

		onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteMain");
		},

/*onFechaChange: function(oEvent) {
			let oDatePicker = oEvent.getSource();
			let oSelectedDate = oDatePicker.getDateValue();
			
			if (oSelectedDate) {
				let sFechaFormateada = oSelectedDate.toLocaleDateString("es-MX");
				this.getView().getModel("uiPantalla").setProperty("/fechaCaptura", sFechaFormateada);
				this._actualizarTablaYTotales(sFechaFormateada);
			}
		},*/
		onFechaChange: function (oEvent) {
			const sFecha = oEvent.getSource().getValue();

			this.getView()
				.getModel("uiPantalla")
				.setProperty("/fechaCaptura", sFecha);

			this._actualizarTablaYTotales(sFecha);
		},

		_actualizarTablaYTotales: function(sFecha) {
            let aTodas = this.getView().getModel("modelo").getData() || [];
            //let aFiltradas = aTodas.filter(act => act.fecha === sFecha);
			let aFiltradas = aTodas.filter(
				act => act.fechaISO === sFecha
			);
            // Actualizar modelo de la tabla filtrada
            this.getView().setModel(new JSONModel(aFiltradas), "modeloFiltrado");
			this.getView().getModel("modeloFiltrado").refresh(true);

            // Calcular total de horas del día
            let fTotal = aFiltradas.reduce((acc, curr) => acc + parseFloat(curr.horas || 0), 0);
            let oModelUI = this.getView().getModel("uiPantalla");
			
            oModelUI.setProperty("/horasTotales", this.getResourceBundle().getText("horasTotales", [sFecha, fTotal.toFixed(1)]));
			oModelUI.setProperty("/tableTitle", this.getResourceBundle().getText("tableActividadesHoy") + " (" + sFecha + ")");
        },

		_limpiarFormulario: function() {
			let oModelUI = this.getView().getModel("uiPantalla");
			oModelUI.setProperty("/horasInvertidas", "");
			oModelUI.setProperty("/descripcion", "");
			oModelUI.setProperty("/requerimiento", "");
			oModelUI.setProperty("/hora", "");
		},

		onGuardar: function(oEvent) {
			let oModelUI = this.getView().getModel("uiPantalla");
			let formData = oModelUI.getData();
			let oClienteSelect = this.byId("clienteSelect");
    		let oProyectoSelect = this.byId("proyectoSelect");
			let oReq = this.byId("requerimientoSelect");
			

			// SANITIZAR DATOS
            let sFechaCaptura = (formData.fechaCaptura || "").trim();
			let sCliente = oClienteSelect ? (oClienteSelect.getSelectedKey() || "").trim() : "";
    		let sProyecto = oProyectoSelect ? (oProyectoSelect.getSelectedKey() || "").trim() : "";
			let sRequerimiento = oReq ? (oReq.getSelectedKey() || "").trim() : "";
            let sDescripcion = (formData.descripcion || "").trim();
            let sHoras = parseFloat(formData.horasInvertidas);

			if (!formData.esCapacitacion && sCliente === "") {
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
			if (!formData.esCapacitacion && sRequerimiento === "") {
                if (sRequerimiento === "") {
                    MessageBox.error("Por favor, ingresa el Requerimiento.", {
                        onClose: function () { oReq.focus(); }
                    });
                    return;
                }
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
			if (sDescripcion === "") {
				let iD = this.byId("descripcionInput");
				MessageBox.error("Por favor, ingresa la Descripción de la actividad.", {
					onClose: function () { iD.focus(); }
				});
				return;
			}

			// VALIDACION DE HORAS
            let aTodas = this.getView().getModel("modelo").getData() || [];
			let aFiltradas = aTodas.filter(
				act => act.fechaISO === sFechaCaptura
			);
			let fTotal = aFiltradas.reduce((acc, curr) => acc + parseFloat(curr.horas || 0), 0);
            
            if (fTotal + sHoras > formData.maximoHoras) {
                MessageBox.error( this.getResourceBundle().getText("msjErrorHoras", [formData.maximoHoras, (fTotal + sHoras)]), {
                        title: "Límite de horas excedido",
						contentWidth: "400px",
						onClose: function () {
							let iH = this.byId("horasInvertidasInput");
							iH.focus();
						}.bind(this)
				});
				return; 
            }

            
			const oNuevaActividad = {
				ConsultorUuid: this._consultorUuidPrueba,

				ClientUuid: formData.esCapacitacion
					? null
					: sCliente,

				ProjectUuid: formData.esCapacitacion
					? null
					: sProyecto,

				ReqUuid: formData.esCapacitacion
					? null
					: sRequerimiento,

				EsCapacitacion: Boolean(formData.esCapacitacion),

				Fecha: sFechaCaptura,

				Horas: sHoras.toFixed(2),

				Descripcion: sDescripcion
			};

			console.log(
				"PAYLOAD REGISTRO:",
				JSON.stringify(oNuevaActividad, null, 2)
			);

			this._guardarActividadSAP(oNuevaActividad);
        },
        
        _guardarDatosModelo: function(sFechaCaptura, sCliente, sProyecto, sRequerimiento, sDescripcion, sHoras, formData) {
            let actividadesRegistradas = this.getView().getModel("modelo").getData();

			// Agregar actividad al modelo
			actividadesRegistradas.push({
				fecha: sFechaCaptura,
				hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
				cliente: sCliente,
				proyecto: formData.esCapacitacion ? "Capacitación Interna" : sProyecto,
				requerimiento: formData.esCapacitacion ? "bench" : sRequerimiento,
				descripcion: formData.descripcion,
				horas: formData.horasInvertidas,
				esCapacitacion: formData.esCapacitacion
			});

            this.getView().getModel("modelo").setData(actividadesRegistradas);
            MessageToast.show("Actividad registrada exitosamente.");

            // Actualizar vista filtrada de la tabla y recalcular totales visuales
            this._actualizarTablaYTotales(sFechaCaptura);

            this._limpiarFormulario();
		},

		onEliminarActividad: function (oEvent) {
            let oButton = oEvent.getSource();
            let oContext = oButton.getBindingContext("modeloFiltrado");
            let oActividadAEliminar = oContext.getObject();

            MessageBox.confirm("¿Estás seguro de que deseas eliminar este registro?", {
                title: "Confirmar eliminación",
				icon: MessageBox.Icon.WARNING,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        let aTodas = this.getView().getModel("modelo").getData();
                        
						let iIndex = aTodas.findIndex(act => 
                            act.hora === oActividadAEliminar.hora && 
                            act.descripcion === oActividadAEliminar.descripcion
                        );

                        if (iIndex !== -1) {
                            aTodas.splice(iIndex, 1); // Elimina el elemento del arreglo
                            this.getView().getModel("modelo").setData(aTodas);
                            
                            // Recalcular la tabla filtrada y los totales
                            this._actualizarTablaYTotales(oActividadAEliminar.fecha);
                            MessageToast.show("Actividad eliminada correctamente.");
                        }
                    }
                }.bind(this)
            });
        },

        onEditarActividad: function (oEvent) {
            let oButton = oEvent.getSource();
            let oContext = oButton.getBindingContext("modeloFiltrado");
            
            let oActividadClonada = Object.assign({}, oContext.getObject()); 
            
            // modelo para el dialogo de edición
            this.getView().setModel(new JSONModel(oActividadClonada), "modeloEdicion");

            if (!this._oDialogoEdicion) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "ns.frontend.fragment.DialogEditarActividad",
                    controller: this
                }).then(function (oDialog) {
                    this._oDialogoEdicion = oDialog;
                    this.getView().addDependent(this._oDialogoEdicion);
                    this._oDialogoEdicion.open();
                }.bind(this));
            } else {
                this._oDialogoEdicion.open();
            }
        },

        onCerrarDialogoEdicion: function () {
            if (this._oDialogoEdicion) {
                this._oDialogoEdicion.close();
            }
        },

        onGuardarEdicionSimulada: function () {
            let oDatosEditados = this.getView().getModel("modeloEdicion").getData();
            let aActividades = this.getView().getModel("modelo").getData();
            let iIndex = aActividades.findIndex(act => act.hora === oDatosEditados.hora && act.fecha === oDatosEditados.fecha);
            
            if (iIndex !== -1) {
                aActividades[iIndex].cliente = oDatosEditados.cliente;
                aActividades[iIndex].horas = oDatosEditados.horas;
                aActividades[iIndex].descripcion = oDatosEditados.descripcion;
                
                if (!aActividades[iIndex].esCapacitacion) {
                    aActividades[iIndex].proyecto = oDatosEditados.proyecto;
                    aActividades[iIndex].requerimiento = oDatosEditados.requerimiento;
                }
                
                this.getView().getModel("modelo").setData(aActividades);
            
                this._actualizarTablaYTotales(oDatosEditados.fecha); 
                
                MessageToast.show("Actividad actualizada correctamente.");
            }
            
            this.onCerrarDialogoEdicion();
        },

		onFilaClickeada: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext("modeloFiltrado");
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
                    this._oDialogoDetalle.setBindingContext(oContext, "modeloFiltrado");
                    this._oDialogoDetalle.open();
                }.bind(this));
            } else {
                this._oDialogoDetalle.setBindingContext(oContext, "modeloFiltrado");
                this._oDialogoDetalle.open();
            }
		},

		onCerrarDialogo: function () {
            if (this._oDialogoDetalle) {
                this._oDialogoDetalle.close();
            }
        },

		onExportarExcel: function() {
			let aCols = [
				{ label: 'Fecha', property: 'fecha', type: EdmType.Date, format: 'yyyy-mm-dd' },
				{ label: 'Hora', property: 'hora', type: EdmType.String },
				{ label: 'Cliente', property: 'cliente', type: EdmType.String },
				{ label: 'Requerimiento', property: 'requerimiento', type: EdmType.String },
				{ label: 'Descripción', property: 'descripcion', type: EdmType.String },
				{ label: 'Horas Registradas', property: 'horas', type: EdmType.Number }
			];

			let oRowBinding = this.byId("tablaActividades").getBinding("items");
			let sNombreArchivo = ExportHelper.generarNombreArchivoConFecha("Registro_Actividades");
            let oSettings = {
                workbook: { columns: aCols },
                dataSource: oRowBinding,
                fileName: sNombreArchivo, 
                worker: false
            };

			let oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(() => oSheet.destroy());
		}



	});
});
