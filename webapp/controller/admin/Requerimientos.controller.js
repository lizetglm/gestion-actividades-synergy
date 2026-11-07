sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet", 
    "sap/ui/export/library",
    "sap/ui/core/Fragment",
    "ns/frontend/util/ExportHelper",
    "ns/frontend/util/RapHelper",

    "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "sap/ui/model/Sorter"
], function(
	Controller, JSONModel, MessageToast, MessageBox,
    Spreadsheet, exportLibrary,Fragment, ExportHelper, RapHelper,

    Filter, FilterOperator, Sorter
) {
	"use strict";
    const EdmType = exportLibrary.EdmType;
    const IDS_REQ = ["inpDescReq"];

	return Controller.extend("ns.frontend.controller.admin.Requerimientos", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteRequerimientos").attachPatternMatched(this._onRouteMatched, this);

            // solo debug
            this._oConsultoresModel = new JSONModel({ items: [] });
            this.getView().setModel(this._oConsultoresModel, "cons");
        },

        _onRouteMatched: function (oEvent) {
            this._sClientUuid = oEvent.getParameter("arguments").clientUuid;
            this._sProjectUuid = oEvent.getParameter("arguments").projectUuid;
            
            // Enlazamos la vista directamente al proyecto específico usando su UUID en OData V4
            this.getView().bindElement({
                path: "/Proyectos(ProjectUuid=" + this._sProjectUuid + ")"
            });
        },

        onCloseColumn: function () {
            this.getOwnerComponent().getRouter().navTo("RouteProyectos", {
                clientUuid: this._sClientUuid
            });
        },

        onExportarReqExcel: function() {
            let aCols = [
                { label: 'ID Requerimiento', property: 'ReqId', type: EdmType.String },
                { label: 'Descripción', property: 'Descripcion', type: EdmType.String }
            ];
            
            let oRowBinding = this.byId("tablaRequerimientos").getBinding("items");
			let sNombreArchivo = ExportHelper.generarNombreArchivoConFecha("Requerimientos_Proyecto");
            let oSettings = {
                workbook: { columns: aCols },
                dataSource: oRowBinding,
                fileName: sNombreArchivo, 
                worker: false
            };

            new Spreadsheet(oSettings).build().finally(function() {
                this.destroy(); 
            });
        },

        onExportarConsultoresExcel: function() {
            let aCols = [
                { label: 'Nombre del Consultor', property: 'nombreConsultor', type: EdmType.String },
                { label: 'Rol Asignado', property: 'rol', type: EdmType.String }
            ];
            
            let oRowBinding = this.byId("tablaConsultoresDetalle").getBinding("items");
            let sNombreArchivo = ExportHelper.generarNombreArchivoConFecha("Consultores_Proyecto");
            let oSettings = {
                workbook: { columns: aCols },
                dataSource: oRowBinding,
                fileName: sNombreArchivo, 
                worker: false
            };

            new Spreadsheet(oSettings).build().finally(function() {
                this.destroy(); 
            });
        },


        // CRUD REQUERIMIENTOS ----------------------
        _abrirDialogoReq: async function (oContext, sTitulo) {
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "ns.frontend.fragment.DialogRequerimiento",
                    controller: this
                }).then((oDialog) => {
                    //oDialog.setBindingContext(null);
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            const oDialog = await this._pDialog;
            this._oContextDialogo = oContext;
            oDialog.setTitle(sTitulo);
            oDialog.setBindingContext(oContext);
            oDialog.open();
        },

        onCerrarDialogoReq: async function () {
            (await this._pDialog).close();
        },

        onAfterCloseDialogo: async function () {
            const oDialog = await this._pDialog;

            RapHelper.descartarCambios(this.getView().getModel(), this._oContextDialogo);
            oDialog.setBindingContext(null);

            IDS_REQ.forEach((sId) =>
                Fragment.byId(this.getView().getId(), sId)?.setValueState("None"));
            this._oContextDialogo = null;
        },

        // CREAR
        onAddRequerimiento: function (oEvent) {
            const oListBinding = this.byId("tablaRequerimientos").getBinding("items");
    
            const oContext = oListBinding.create({}, true);
            this._abrirDialogoReq(oContext, "Nuevo Requerimiento");
        },

        // EDITAR
        onEditRequerimiento: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            this._abrirDialogoReq(oContext, "Editar Requerimiento");
        },

        // GUARDAR
        _validar: function (sId, bValido, sTexto) {
            const oInput = Fragment.byId(this.getView().getId(), sId);
            oInput?.setValueState(bValido ? "None" : "Error");
            if (!bValido) {
                oInput?.setValueStateText(sTexto);
                oInput?.focus();
            }
            return bValido;
        },

        onGuardarRequerimiento: async function () {
            const oModel = this.getView().getModel();
            const oDialog = await this._pDialog;
            const oContext = this._oContextDialogo;

            const sDescripcion = (oContext.getProperty("Descripcion") || "").trim();

            // Validaciones básicas
            if (!this._validar("inpDescReq", sDescripcion.length > 0, "La descripción es obligatoria.")) {
                return;
            }
            
            if (await RapHelper.guardar(oModel, oDialog)) {
                MessageToast.show("Requerimiento guardado");
                oDialog.close();
                
                this.getView().getElementBinding().refresh();
            }
        },

        // ELIMINAR
        onDeleteRequerimiento: async function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const bOk = await RapHelper.confirmar(
                `¿Eliminar definitivamente el requerimiento ${oContext.getProperty("ReqId")}?\n\n` +
                `"${oContext.getProperty("Descripcion")}" \n\n` +
                "Esta acción no se puede deshacer.");
            if (!bOk) { return; }

            try {
                await RapHelper.borrar(oContext);
                MessageToast.show("Requerimiento eliminado");
            } catch (oError) {
                RapHelper.mostrarError(oError.message);
            }
        },



        // CRUD ASIGNACIONES (CONSULTORES) -----------------------------
        _abrirDialogoConsultor: async function (oContext) {
            if (!this._pDialogConsultor) {
                this._pDialogConsultor = Fragment.load({
                    id: this.getView().getId(),
                    name: "ns.frontend.fragment.DialogAsignarCons",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            const oDialog = await this._pDialogConsultor;
            this._oContextConsultor = oContext;
            oDialog.setTitle("Asignar consultor");
            oDialog.setBindingContext(oContext);
            oDialog.open();
        },

        onCerrarDialogConsultor: async function () {
            (await this._pDialogConsultor).close();
        },

        onAfterCloseDialogoConsultor: async function () {
            const oDialog = await this._pDialogConsultor;
            RapHelper.descartarCambios(this.getView().getModel(), this._oContextConsultor);
            oDialog.setBindingContext(null);
            ["cmbConsultor", "cmbRol"].forEach((sId) =>
                Fragment.byId(this.getView().getId(), sId)?.setValueState("None"));
            this._oContextConsultor = null;
        },

        // Trae los consultores activos 
        _cargarConsultores: async function () {
            const oBinding = this.getView().getModel().bindList("/Consultores", null,
                [new Sorter("Nombre")],
                [new Filter("Activo", FilterOperator.EQ, true)],
                { $select: "ConsultorUuid,Nombre,Correo" });
            try {
                const aContextos = await oBinding.requestContexts(0, 500);
                this._oConsultoresModel.setData({
                    items: aContextos.map((oCtx) => oCtx.getObject())
                });
            } finally {
                oBinding.destroy();
            }
        },

        onAsignarConsultor: async function () {
            try {
                await this._cargarConsultores();
            } catch (oError) {
                RapHelper.mostrarError(oError.message); // muestra el motivo real
                return;
            }
            const oListBinding = this.byId("tablaConsultoresDetalle").getBinding("items");
            this._abrirDialogoConsultor(oListBinding.create({}, true));
        },

        onGuardarConsultor: async function () {
            const oDialog = await this._pDialogConsultor;
            const oContext = this._oContextConsultor;
            const sConsultor = oContext.getProperty("ConsultorUuid");
            const sRol = (oContext.getProperty("Rol") || "").trim();

            if (!this._validar("cmbConsultor", !!sConsultor, "Selecciona un consultor")
                || !this._validar("cmbRol", !!sRol, "El rol es obligatorio")) {
                return;
            }

            if (await RapHelper.guardar(this.getView().getModel(), oDialog)) {
                MessageToast.show("Consultor asignado al proyecto");
                oDialog.close();
                RapHelper.refrescar(this.byId("tablaConsultoresDetalle").getBinding("items"));
            }
        },

        // Quitar consultor del proyecto (borrado real)
        onDeleteAsignacion: async function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const bOk = await RapHelper.confirmar(
                `¿Quitar a ${oContext.getProperty("ConsultorNombre")} de este proyecto?`);
            if (!bOk) { return; }
            try {
                await RapHelper.borrar(oContext);
                MessageToast.show("Consultor removido del proyecto");
            } catch (oError) {
                RapHelper.mostrarError(oError.message);
            }
        },


	});
});