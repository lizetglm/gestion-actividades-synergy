sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet", 
    "sap/ui/export/library",
    "ns/frontend/util/ExportHelper",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Controller, Fragment, JSONModel, MessageToast, MessageBox, 
    Spreadsheet, exportLibrary, ExportHelper, Filter, FilterOperator
) {
    "use strict";
    const EdmType = exportLibrary.EdmType;

    return Controller.extend("ns.frontend.controller.admin.Clientes", {


        // --- NAVEGACIÓN (LEER) ---
        onSelectCliente: function (oEvent) {
            var oItem = oEvent.getSource(); 
            var oContext = oItem.getBindingContext();
            var sClientUuid = oContext.getProperty("ClientUuid");
            
            this.getOwnerComponent().getRouter().navTo("RouteProyectos", { clientUuid: sClientUuid });
        },

        onBack: function() {
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },

        onExportarExcel: function () {
            let aCols = [
                { label: 'Nombre del Cliente', property: 'Nombre', type: EdmType.String },
                { label: 'Teléfono', property: 'Telefono', type: EdmType.String },
                { label: 'Correo', property: 'Correo', type: EdmType.String },
                { label: 'Estatus', property: 'Activo', type: EdmType.String }
            ];

            let oRowBinding = this.byId("tablaClientes").getBinding("items"); 
            let sNombreArchivo = ExportHelper.generarNombreArchivoConFecha("Portafolio_Clientes");
            let oSettings = {
                workbook: { columns: aCols },
                dataSource: oRowBinding,
                fileName: sNombreArchivo, 
                worker: false
            };

            let oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(() => oSheet.destroy());
        },

        onFiltrar: function () {
            const sTexto = this.byId("sfCliente").getValue().trim();
            const sEstatus = this.byId("selEstatus").getSelectedKey();
            const aFiltros = [];

            if (sTexto) {
                aFiltros.push(new Filter({
                    filters: [
                        new Filter({ path: "Nombre", operator: FilterOperator.Contains, value1: sTexto, caseSensitive: false }),
                        new Filter({ path: "Correo", operator: FilterOperator.Contains, value1: sTexto, caseSensitive: false })
                    ],
                    and: false
                }));
            }
            if (sEstatus !== "Todos") {
                aFiltros.push(new Filter("Activo", FilterOperator.EQ, sEstatus === "Activo"));
            }
            this.byId("tablaClientes").getBinding("items").filter(aFiltros);
        },

        _getNamespace: async function () {
            if (!this._sNS) {
                const sContainer = await this.getView().getModel().getMetaModel()
                    .requestObject("/$EntityContainer");
                // "com.sap.gateway.srvd.xxx.v0001.Container" -> sin ".Container"
                this._sNS = sContainer.substring(0, sContainer.lastIndexOf("."));
            }
            return this._sNS;
        },

        _ejecutarAccion: async function (oContext, sAccion) {
            const oModel = this.getView().getModel();
            const sNS = await this._getNamespace();
            sap.ui.getCore().getMessageManager().removeAllMessages();
            const oOperacion = oModel.bindContext(`${sNS}.${sAccion}(...)`, oContext,
                { $$inheritExpandSelect: true });
            await oOperacion.invoke("$auto");
        },

        // --- CRUD OPERACIONES ---
        _abrirDialogo: async function (oContext, sTitulo) {
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "ns.frontend.fragment.DialogCliente",
                    controller: this
                }).then((oDialog) => {
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

        onCerrarDialogCliente: async function () {
            (await this._pDialog).close();
        },

        _descartarCambios: function () {
            const oModel = this.getView().getModel();
            const oContext = this._oContextDialogo;

            if (oContext && oContext.isTransient()) {
                // Creación aún no guardada: se cancela y desaparece la fila fantasma
                oContext.created()?.catch(() => {}); 
                oContext.delete().catch(() => {});
            }
            if (oModel.hasPendingChanges("grupoDialogo")) {
                // Revierte ediciones pendientes de un cliente existente
                oModel.resetChanges("grupoDialogo");
            }
        },

        // Se ejecuta al cerrar por cualquier vía (Cancelar, Guardar o ESC)
        onAfterCloseDialogo: async function () {
            const oDialog = await this._pDialog;

            this._descartarCambios();

            oDialog.setBindingContext(null);
            Fragment.byId(this.getView().getId(), "inpNombre")?.setValueState("None");
            Fragment.byId(this.getView().getId(), "inpTelefono")?.setValueState("None");
            Fragment.byId(this.getView().getId(), "inpCorreo")?.setValueState("None");
            this._oContextDialogo = null;
        },

        // Crear
        onAddCliente: function () {
            const oListBinding = this.byId("tablaClientes").getBinding("items");
            // Contexto transitorio, el POST se envía hasta el submitBatch
            const oContext = oListBinding.create({ Activo: true }, true);
            this._abrirDialogo(oContext, "Nuevo Cliente");
        },

        // Editar
        onEditCliente: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            this._abrirDialogo(oContext, "Editar Cliente");
        },

        // Guardar
        onGuardarCliente: async function () {
            const oModel = this.getView().getModel();
            const oDialog = await this._pDialog;
            const oContext = this._oContextDialogo;

            const oInpNombre = Fragment.byId(this.getView().getId(), "inpNombre");
            const oInpTelefono = Fragment.byId(this.getView().getId(), "inpTelefono");
            const oInpCorreo = Fragment.byId(this.getView().getId(), "inpCorreo");

            const sNombre = (oContext.getProperty("Nombre") || "").trim();
            const sTelefono = (oContext.getProperty("Telefono") || "").trim();
            const sCorreo = (oContext.getProperty("Correo") || "").trim();

            // Validaciones básicas
            if (!sNombre) {
                oInpNombre?.setValueState("Error");
                oInpNombre?.focus();
                oInpNombre?.setValueStateText("El nombre es obligatorio");
                return;
            }oInpNombre?.setValueState("None");

            if (!sTelefono) {
                oInpTelefono?.setValueState("Error");
                oInpTelefono?.focus();
                oInpTelefono?.setValueStateText("El teléfono es obligatorio");
                return;
            }oInpTelefono?.setValueState("None");

            if (!sCorreo) {
                oInpCorreo?.setValueState("Error");
                oInpCorreo?.focus();
                oInpCorreo?.setValueStateText("El correo es obligatorio");
                return;
            }oInpCorreo?.setValueState("None");
            

            oDialog.setBusy(true);
            try {
                sap.ui.getCore().getMessageManager().removeAllMessages();
                await oModel.submitBatch("grupoDialogo");

                if (oModel.hasPendingChanges("grupoDialogo")) {
                    this._mostrarErrorBackend("No se pudo guardar. Revisa los datos e intenta de nuevo.");
                } else {
                    MessageToast.show("Cliente guardado");
                    oDialog.close();
                    this.byId("tablaClientes").getBinding("items").refresh();
                }
            } catch (oError) {
                this._mostrarErrorBackend(oError.message);
            } finally {
                oDialog.setBusy(false);
}
        },

        onInactivarCliente: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            MessageBox.confirm(`¿Inactivar al cliente "${oContext.getProperty("Nombre")}"?`, {
                onClose: async (sAccion) => {
                    if (sAccion !== MessageBox.Action.OK) { return; }
                    try {
                        await this._ejecutarAccion(oContext, "inactivar");
                        MessageToast.show("Cliente inactivado");
                    } catch (oError) {
                        this._mostrarErrorBackend(oError.message);
                    }
                }
            });
        },

        onActivarCliente: async function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            try {
                await this._ejecutarAccion(oContext, "activar");
                MessageToast.show("Cliente activado");
            } catch (oError) {
                this._mostrarErrorBackend(oError.message);
            }
        },

        // Muestra los mensajes de validación que devuelve RAP
        _mostrarErrorBackend: function (sRespaldo) {
            const aErrores = sap.ui.getCore().getMessageManager().getMessageModel().getData()
                .filter((oMsg) => oMsg.getType() === "Error")
                .map((oMsg) => oMsg.getMessage());
            MessageBox.error(aErrores.length ? [...new Set(aErrores)].join("\n") : sRespaldo);
        },

    });
});