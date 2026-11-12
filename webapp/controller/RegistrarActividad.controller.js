sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/export/Spreadsheet",
	"sap/ui/export/library",
	"ns/frontend/util/ExportHelper"
], function (
	Controller, JSONModel, Fragment, MessageToast, MessageBox, Spreadsheet, exportLibrary, ExportHelper
) {
	"use strict";
	const EdmType = exportLibrary.EdmType;

	return Controller.extend("ns.frontend.controller.RegistrarActividad", {
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		onInit: function () {
			let sFechaHoy = this.obtenerFechaISO(new Date());
			let uiEstado = {
				tituloHeader: this.getResourceBundle().getText("titleRegistrarActividad"),
				userName: "User",
				horasTotales: this.getResourceBundle().getText("horasTotales", ["1", "0.0"]),
				maximoHoras: null,
				diaCierreMensual: null,
				politicaDiasPendientes: null,
				fechaCaptura: sFechaHoy,
				horasInvertidas: "",
				esCapacitacion: false,
				cliente: "",
				proyecto: "",
				requerimiento: "",
				descripcion: "",
				saludo: this.getResourceBundle().getText("saludoRegistro"),
				tableTitle: this.getResourceBundle().getText("tableActividadesHoy") +
					" (" + new Date().toLocaleDateString("es-MX") + ")"
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

			this.getView().setModel(new JSONModel([]), "modelo");
			this.getView().setModel(new JSONModel([]), "modeloFiltrado");
			this.consultorUuid = null;
			this.usuarioActual = null;
			this.cargarUsuarioActual();
			this.cargarCatalogos();
			this.actualizarTablaYTotales(sFechaHoy);
			this.cargarActividades();
		},

		cargarUsuarioActual: async function () {
			try {
				const oOData = this.getOwnerComponent()
					.getModel("actividadesOData");

				if (!oOData) {
					throw new Error("No existe el modelo actividadesOData.");
				}

				const oBinding = oOData.bindList("/MiUsuario");
				const aContexts = await oBinding.requestContexts(0, 10);
				const aUsuarios = await Promise.all(
					aContexts.map(oContext => oContext.requestObject())
				);

				if (aUsuarios.length !== 1) {
					throw new Error(
						"No se pudo identificar de forma única al usuario SAP."
					);
				}

				const oUsuario = aUsuarios[0];
				if (!oUsuario.Activo || !oUsuario.ConsultorUuid) {
					throw new Error(
						"El usuario está inactivo o no tiene consultor asociado."
					);
				}

				this.consultorUuid = oUsuario.ConsultorUuid;
				this.usuarioActual = oUsuario;
			} catch (oError) {
				this.consultorUuid = null;
				this.usuarioActual = null;

				MessageBox.error(
					"No fue posible identificar al usuario autenticado en SAP."
				);
			}
		},


		obtenerLimiteHorasSAP: async function () {

			const oOData = this.getOwnerComponent()
				.getModel("actividadesOData");

			if (!oOData) {
				throw new Error(
					"No se encontró el modelo OData de actividades."
				);
			}

			const oBinding = oOData.bindList(
				"/Configuraciones",
				undefined,
				undefined,
				undefined,
				{
					$$groupId: "$direct",
					$filter:
						"ClaveParametro eq 'LIMITE_HORAS_DIARIAS' " +
						"and Activo eq true"
				}
			);

			try {

				const aContextos =
					await oBinding.requestContexts(0, 2);

				if (aContextos.length !== 1) {
					throw new Error(
						"No se encontró una configuración única " +
						"para LIMITE_HORAS_DIARIAS."
					);
				}

				const oConfiguracion =
					await aContextos[0].requestObject();

				const nLimite = Number(oConfiguracion.Valor);

				if (!Number.isFinite(nLimite) || nLimite <= 0) {
					throw new Error(
						"El límite diario configurado en SAP no es válido."
					);
				}

				this.getView()
					.getModel("uiPantalla")
					.setProperty("/maximoHoras", nLimite);

				console.log(
					"Límite diario recuperado desde SAP:",
					nLimite
				);

				return nLimite;

			} finally {
				oBinding.destroy();
			}
		},


		obtenerReglasPeriodoSAP: async function () {

			const oOData = this.getOwnerComponent()
				.getModel("actividadesOData");

			if (!oOData) {
				throw new Error(
					"No se encontró el modelo OData de actividades."
				);
			}

			const oBinding = oOData.bindList(
				"/Configuraciones",
				undefined,
				undefined,
				undefined,
				{
					$$groupId: "$direct"
				}
			);

			try {
				const aContextos =
					await oBinding.requestContexts(0, 100);

				const aConfiguraciones = await Promise.all(
					aContextos.map(oContexto =>
						oContexto.requestObject()
					)
				);

				const obtenerValor = sClave => {
					const oParametro = aConfiguraciones.find(
						oConfiguracion =>
							oConfiguracion.ClaveParametro === sClave &&
							oConfiguracion.Activo === true
					);

					if (!oParametro) {
						throw new Error(
							"No existe el parámetro activo: " + sClave
						);
					}

					return String(oParametro.Valor);
				};

				const nDiaCierre = Number(
					obtenerValor("DIA_CIERRE_MENSUAL")
				);

				const sPolitica = obtenerValor(
					"POLITICA_DIAS_PENDIENTES"
				);

				if (
					!Number.isInteger(nDiaCierre) ||
					nDiaCierre < 1 ||
					nDiaCierre > 31
				) {
					throw new Error(
						"El día de cierre mensual no es válido."
					);
				}

				if (!["BLOQUEAR", "ADVERTIR"].includes(sPolitica)) {
					throw new Error(
						"La política de días pendientes no es válida."
					);
				}

				const oReglas = {
					diaCierreMensual: nDiaCierre,
					politicaDiasPendientes: sPolitica
				};

				const oModeloUI =
					this.getView().getModel("uiPantalla");

				oModeloUI.setProperty(
					"/diaCierreMensual",
					nDiaCierre
				);

				oModeloUI.setProperty(
					"/politicaDiasPendientes",
					sPolitica
				);

				console.log(
					"Reglas de periodo recuperadas desde SAP:",
					oReglas
				);

				return oReglas;

			} finally {
				oBinding.destroy();
			}
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


		cargarEntidad: async function (sEntidad) {
			const oOData = this.getOwnerComponent()
				.getModel("actividadesOData");

			if (!oOData) {
				throw new Error("No existe el modelo actividadesOData");
			}

			const oBinding = oOData.bindList("/" + sEntidad);
			const aContexts = await oBinding.requestContexts(0, 100);
			const aDatos = await Promise.all(
				aContexts.map(oContext => oContext.requestObject())
			);
			return aDatos;
		},

		cargarCatalogos: async function () {
			const oVista = this.getView();
			const oCatalogos = oVista.getModel("catalogos");

			try {
				const [aClientes, aProyectos, aRequerimientos] =
					await Promise.all([
						this.cargarEntidad("Clientes"),
						this.cargarEntidad("Proyectos"),
						this.cargarEntidad("Requerimientos")
					]);

				console.log("CLIENTES RAW:", aClientes);
				console.log("PROYECTOS RAW:", aProyectos);
				console.log("REQUERIMIENTOS RAW:", aRequerimientos);

				this.aClientesSAP = aClientes.map(oCliente => ({
					uuid: oCliente.ClientUuid,
					nombre: oCliente.Nombre
				}));

				this.aProyectosSAP = aProyectos.map(oProyecto => ({
					uuid: oProyecto.ProjectUuid,
					clienteUuid: oProyecto.ClientUuid,
					nombre: oProyecto.Nombre,
					activo: oProyecto.Activo
				}));

				console.table(this.aClientesSAP);
				console.table(this.aProyectosSAP);
				console.table(this.aRequerimientosSAP);

				this.aRequerimientosSAP = aRequerimientos.map(oReq => ({
					uuid: oReq.ReqUuid,
					proyectoUuid: oReq.ProjectUuid,
					clienteUuid: oReq.ClientUuid,
					nombre: oReq.Descripcion
				}));

				oCatalogos.setProperty(
					"/clientes",
					this.aClientesSAP
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

				this.actualizarNombresActividades();

				console.log("Clientes:", this.aClientesSAP);
				console.log("Proyectos:", this.aProyectosSAP);
				console.log("Requerimientos:", this.aRequerimientosSAP);

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

			const aProyectos = (this.aProyectosSAP || []).filter(
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

			const aRequerimientos = (this.aRequerimientosSAP || [])
				.filter(oReq => oReq.proyectoUuid === sProyectoUuid);

			console.log("PROYECTO SELECCIONADO:", sProyectoUuid);
			console.log("REQUERIMIENTOS DEL PROYECTO:", aRequerimientos);

			oCatalogos.setProperty("/requerimientos", aRequerimientos);
		},


		actualizarNombresActividades: function () {
			const oModelo = this.getView().getModel("modelo");
			const aActividades = oModelo.getData() || [];

			const aClientes = this.aClientesSAP || [];
			const aRequerimientos = this.aRequerimientosSAP || [];

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

			this.actualizarTablaYTotales(sFecha);
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
				this.actualizarNombresActividades();

				const sFecha = oVista.getModel("uiPantalla")
					.getProperty("/fechaCaptura");

				this.actualizarTablaYTotales(sFecha);

			} catch (oError) {
				console.error("Error al recuperar actividades:", oError);

				MessageBox.error(
					"No fue posible recuperar las actividades desde SAP."
				);
			} finally {
				oVista.setBusy(false);
			}
		},


		guardarActividadSAP: async function (oNuevaActividad) {

			const oOData = this.getOwnerComponent()
				.getModel("actividadesOData");

			if (!oOData) {
				MessageBox.error("No existe el modelo actividadesOData.");
				return;
			}

			let oContexto;

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

				console.log(
					"DATOS QUE SE ENVIARÁN A SAP:",
					oNuevaActividad
				);

				console.log("Iniciando creación en SAP...");

				const oResultadoCreacion = new Promise(
					(resolve, reject) => {

						const fnCreacionCompletada = (oEvent) => {

							if (
								oEvent.getParameter("context") !==
								oContexto
							) {
								return;
							}

							oBinding.detachCreateCompleted(
								fnCreacionCompletada
							);

							const bExito =
								oEvent.getParameter("success");

							if (bExito) {
								resolve();
							} else {
								reject(new Error(
									"SAP rechazó la creación"
								));
							}
						};

						oBinding.attachCreateCompleted(
							fnCreacionCompletada
						);

						try {
							oContexto = oBinding.create(
								oNuevaActividad
							);
						} catch (oError) {
							oBinding.detachCreateCompleted(
								fnCreacionCompletada
							);
							reject(oError);
						}
					}
				);

				await oResultadoCreacion;

			} catch (oError) {

				console.error(
					"ERROR AL GUARDAR EN SAP:",
					oError
				);

				const sMensajeSAP =
					this.obtenerMensajeErrorSAP();

				console.log(
					"MENSAJE RECUPERADO DE SAP:",
					sMensajeSAP
				);

				if (oContexto && oContexto.isTransient()) {

					try {
						await oContexto.delete("$direct");
					} catch (oEliminarError) {
						console.warn(
							"No se pudo descartar el registro:",
							oEliminarError
						);
					}
				}

				if (
					sMensajeSAP &&
					sMensajeSAP.toLowerCase()
						.includes("periodo mensual") &&
					sMensajeSAP.toLowerCase()
						.includes("cerrado")
				) {

					MessageBox.error(
						"No es posible registrar esta actividad " +
						"porque el periodo mensual correspondiente " +
						"a la fecha seleccionada está cerrado.\n\n" +
						"Selecciona una fecha de un periodo abierto.",
						{
							title: "Periodo mensual cerrado"
						}
					);

				} else {

					MessageBox.error(
						sMensajeSAP ||
						"SAP rechazó el registro de la actividad. " +
						"Verifica los datos ingresados.",
						{
							title: "No se pudo guardar"
						}
					);

				}
				return;
			}


			console.log(
				"REGISTRO CREADO CORRECTAMENTE EN SAP"
			);

			this.getOwnerComponent()
				.getEventBus()
				.publish("actividades", "actualizadas", {
					fecha: oNuevaActividad.Fecha
				});
			this.limpiarFormulario();
			MessageToast.show(
				"Actividad guardada correctamente en SAP."
			);
			try {

				await this.cargarActividades();

			} catch (oError) {

				console.error(
					"La actividad se guardó, " +
					"pero falló la actualización:",
					oError
				);

			}
		},


		obtenerMensajeErrorSAP: function () {

			const oMessageManager =
				sap.ui.getCore().getMessageManager();

			const aMensajes =
				oMessageManager.getMessageModel().getData() || [];

			const oMensajePeriodo = aMensajes.find(oMensaje => {

				const sTexto =
					String(oMensaje.message || "").toLowerCase();

				return sTexto.includes("periodo mensual") &&
					sTexto.includes("cerrado");

			});

			if (oMensajePeriodo) {
				return oMensajePeriodo.message;
			}

			return null;
		},


		onBack: function () {
			this.getOwnerComponent().getRouter().navTo("RouteMain");
		},

		/*onFechaChange: function(oEvent) {
					let oDatePicker = oEvent.getSource();
					let oSelectedDate = oDatePicker.getDateValue();
					
					if (oSelectedDate) {
						let sFechaFormateada = oSelectedDate.toLocaleDateString("es-MX");
						this.getView().getModel("uiPantalla").setProperty("/fechaCaptura", sFechaFormateada);
						this.actualizarTablaYTotales(sFechaFormateada);
					}
				},*/
		onFechaChange: function (oEvent) {
			const sFecha = oEvent.getSource().getValue();

			this.getView()
				.getModel("uiPantalla")
				.setProperty("/fechaCaptura", sFecha);

			this.actualizarTablaYTotales(sFecha);
		},

		actualizarTablaYTotales: function (sFecha) {
			let aTodas = this.getView().getModel("modelo").getData() || [];
			//let aFiltradas = aTodas.filter(act => act.fecha === sFecha);
			let aFiltradas = aTodas.filter(
				act => act.fechaISO === sFecha
			);
			this.getView().setModel(new JSONModel(aFiltradas), "modeloFiltrado");
			this.getView().getModel("modeloFiltrado").refresh(true);
			let fTotal = aFiltradas.reduce((acc, curr) => acc + parseFloat(curr.horas || 0), 0);
			let oModelUI = this.getView().getModel("uiPantalla");

			oModelUI.setProperty("/horasTotales", this.getResourceBundle().getText("horasTotales", [sFecha, fTotal.toFixed(1)]));
			oModelUI.setProperty("/tableTitle", this.getResourceBundle().getText("tableActividadesHoy") + " (" + sFecha + ")");
		},

		limpiarFormulario: function () {
			let oModelUI = this.getView().getModel("uiPantalla");
			oModelUI.setProperty("/horasInvertidas", "");
			oModelUI.setProperty("/descripcion", "");
			oModelUI.setProperty("/requerimiento", "");
			oModelUI.setProperty("/hora", "");
		},


		onGuardar: async function (oEvent) {
			if (!this.consultorUuid) {
				MessageBox.error(
					"No se ha identificado al consultor autenticado. " +
					"Espera a que termine de cargar la sesión."
				);
				return;
			}

			let oModelUI = this.getView().getModel("uiPantalla");
			let formData = oModelUI.getData();

			let oClienteSelect = this.byId("clienteSelect");
			let oProyectoSelect = this.byId("proyectoSelect");
			let oReq = this.byId("requerimientoSelect");

			let sFechaCaptura = (formData.fechaCaptura || "").trim();
			let sCliente = oClienteSelect
				? (oClienteSelect.getSelectedKey() || "").trim()
				: "";
			let sProyecto = oProyectoSelect
				? (oProyectoSelect.getSelectedKey() || "").trim()
				: "";
			let sRequerimiento = oReq
				? (oReq.getSelectedKey() || "").trim()
				: "";
			let sDescripcion = (formData.descripcion || "").trim();
			let sHoras = parseFloat(formData.horasInvertidas);

			if (!formData.esCapacitacion && sCliente === "") {
				MessageBox.error(
					"Recuerda seleccionar el contexto del trabajo (Cliente).",
					{
						onClose: function () {
							oClienteSelect.focus();
						}
					}
				);
				return;
			}
			if (!formData.esCapacitacion && sProyecto === "") {
				MessageBox.error(
					"Recuerda seleccionar el contexto del trabajo (Proyecto).",
					{
						onClose: function () {
							oProyectoSelect.focus();
						}
					}
				);
				return;
			}
			if (!formData.esCapacitacion && sRequerimiento === "") {
				MessageBox.error(
					"Por favor, ingresa el Requerimiento.",
					{
						onClose: function () {
							oReq.focus();
						}
					}
				);
				return;
			}
			if (sFechaCaptura === "") {
				MessageBox.error("Por favor, ingresa la Fecha de captura.");
				return;
			}
			if (!Number.isFinite(sHoras) || sHoras <= 0) {
				let iH = this.byId("horasInvertidasInput");

				MessageBox.error(
					"Por favor, ingresa una cantidad de horas válida.",
					{
						onClose: function () {
							iH.focus();
						}
					}
				);
				return;
			}

			if (sDescripcion === "") {
				let iD = this.byId("descripcionInput");

				MessageBox.error(
					"Por favor, ingresa la Descripción de la actividad.",
					{
						onClose: function () {
							iD.focus();
						}
					}
				);
				return;
			}

			// CONSULTAR CONFIGURACIONES DEL PERIODO

			let oReglasPeriodo;

			try {

				oReglasPeriodo = await this.obtenerReglasPeriodoSAP();

			} catch (oError) {

				console.error(
					"Error consultando reglas del periodo:",
					oError
				);

				MessageBox.error(
					"No fue posible consultar las reglas " +
					"de cierre mensual configuradas en SAP.\n\n" +
					oError.message
				);

				return;
			}

			console.log(
				"Día de cierre mensual:",
				oReglasPeriodo.diaCierreMensual
			);

			console.log(
				"Política de días pendientes:",
				oReglasPeriodo.politicaDiasPendientes
			);

			let nLimiteHoras;

			try {

				nLimiteHoras = await this.obtenerLimiteHorasSAP();

			} catch (oError) {

				console.error(
					"Error consultando límite de horas SAP:",
					oError
				);

				MessageBox.error(
					"No fue posible consultar el límite diario " +
					"configurado en SAP. No se registrará la actividad.\n\n" +
					oError.message
				);

				return;
			}

			const aTodas =
				this.getView().getModel("modelo").getData() || [];

			const aFiltradas = aTodas.filter(oActividad =>
				oActividad.fechaISO === sFechaCaptura &&
				oActividad.ConsultorUuid === this.consultorUuid
			);

			const fTotal = aFiltradas.reduce(
				(nAcumulado, oActividad) =>
					nAcumulado + Number(oActividad.horas || 0),
				0
			);

			const fTotalProyectado = fTotal + sHoras;

			console.log("Validación dinámica de horas:", {
				limiteSAP: nLimiteHoras,
				horasRegistradas: fTotal,
				horasNuevas: sHoras,
				totalProyectado: fTotalProyectado
			});

			if (fTotalProyectado > nLimiteHoras) {

				MessageBox.error(
					this.getResourceBundle().getText(
						"msjErrorHoras",
						[
							nLimiteHoras,
							Number(fTotalProyectado.toFixed(2))
						]
					),
					{
						title: "Límite de horas excedido",
						contentWidth: "400px",
						onClose: function () {

							const oInput =
								this.byId("horasInvertidasInput");

							if (oInput) {
								oInput.focus();
							}

						}.bind(this)
					}
				);

				return;
			}

			const oNuevaActividad = {
				ConsultorUuid: this.consultorUuid,

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

			this.guardarActividadSAP(oNuevaActividad);
		},


		guardarDatosModelo: function (sFechaCaptura, sCliente, sProyecto, sRequerimiento, sDescripcion, sHoras, formData) {
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
			this.actualizarTablaYTotales(sFechaCaptura);

			this.limpiarFormulario();
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
							this.actualizarTablaYTotales(oActividadAEliminar.fecha);
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

			this.getView().setModel(new JSONModel(oActividadClonada), "modeloEdicion");

			if (!this.oDialogoEdicion) {
				Fragment.load({
					id: this.getView().getId(),
					name: "ns.frontend.fragment.DialogEditarActividad",
					controller: this
				}).then(function (oDialog) {
					this.oDialogoEdicion = oDialog;
					this.getView().addDependent(this.oDialogoEdicion);
					this.oDialogoEdicion.open();
				}.bind(this));
			} else {
				this.oDialogoEdicion.open();
			}
		},

		onCerrarDialogoEdicion: function () {
			if (this.oDialogoEdicion) {
				this.oDialogoEdicion.close();
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

				this.actualizarTablaYTotales(oDatosEditados.fecha);

				MessageToast.show("Actividad actualizada correctamente.");
			}

			this.onCerrarDialogoEdicion();
		},

		onFilaClickeada: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext("modeloFiltrado");
			var oView = this.getView();

			if (!this.oDialogoDetalle) {
				Fragment.load({
					id: oView.getId(),
					name: "ns.frontend.fragment.DetalleActividad",
					controller: this
				}).then(function (oDialog) {
					this.oDialogoDetalle = oDialog;

					oView.addDependent(this.oDialogoDetalle);

					this.oDialogoDetalle.setBindingContext(oContext, "modeloFiltrado");
					this.oDialogoDetalle.open();
				}.bind(this));
			} else {
				this.oDialogoDetalle.setBindingContext(oContext, "modeloFiltrado");
				this.oDialogoDetalle.open();
			}
		},

		onCerrarDialogo: function () {
			if (this.oDialogoDetalle) {
				this.oDialogoDetalle.close();
			}
		},

		onExportarExcel: function () {
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
