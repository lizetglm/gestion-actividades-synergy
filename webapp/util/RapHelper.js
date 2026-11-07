sap.ui.define(["sap/m/MessageBox", "sap/base/Log"], function (MessageBox, Log) {
    "use strict";

    const GRUPO = "grupoDialogo"; // debe coincidir con updateGroupId del manifest
    let sNamespace;

    const _mensajes = () => sap.ui.getCore().getMessageManager();

    return {
        GRUPO,

        getNamespace: async function (oModel) {
            if (!sNamespace) {
                const sContainer = await oModel.getMetaModel().requestObject("/$EntityContainer");
                sNamespace = sContainer.substring(0, sContainer.lastIndexOf("."));
            }
            return sNamespace;
        },

        // Ejecuta una acción RAP ligada a un contexto (inactivar, activar...)
        ejecutarAccion: async function (oModel, oContext, sAccion) {
            const sNS = await this.getNamespace(oModel);
            _mensajes().removeAllMessages();
            const oOperacion = oModel.bindContext(`${sNS}.${sAccion}(...)`, oContext,
                { $$inheritExpandSelect: true });
            await oOperacion.invoke("$auto");
        },

        // Muestra los mensajes de error que devolvió RAP
        mostrarError: function (sRespaldo) {
            const aErrores = _mensajes().getMessageModel().getData()
                .filter((oMsg) => oMsg.getType() === "Error")
                .map((oMsg) => oMsg.getMessage());
            MessageBox.error(aErrores.length ? [...new Set(aErrores)].join("\n") : sRespaldo);
        },

        confirmar: function (sTexto) {
            return new Promise((resolve) => {
                MessageBox.confirm(sTexto, {
                    onClose: (sAccion) => resolve(sAccion === MessageBox.Action.OK)
                });
            });
        },

        // Descarta creaciones o ediciones no guardadas del diálogo
        descartarCambios: function (oModel, oContext) {
            if (oContext && oContext.isTransient()) {
                oContext.created()?.catch(() => {});
                oContext.delete().catch(() => {});
            }
            if (oModel.hasPendingChanges(GRUPO)) {
                oModel.resetChanges(GRUPO);
            }
        },

        // Envía el grupo; devuelve true si se guardó
        guardar: async function (oModel, oDialog) {
            oDialog.setBusy(true);
            try {
                _mensajes().removeAllMessages();
                await oModel.submitBatch(GRUPO);
                if (oModel.hasPendingChanges(GRUPO)) {
                    this.mostrarError("No se pudo guardar. Revisa los datos e intenta de nuevo.");
                    return false;
                }
                return true;
            } catch (oError) {
                this.mostrarError(oError.message);
                return false;
            } finally {
                oDialog.setBusy(false);
            }
        },
        
        // Recarga una lista (relativa o absoluta)
        refrescar: async function (oListBinding) {
            try {
                const oPadre = oListBinding.getContext();
                if (oListBinding.isRelative() && oPadre?.requestSideEffects) {
                    await oPadre.requestSideEffects(
                        [{ $NavigationPropertyPath: oListBinding.getPath() }]);
                } else {
                    oListBinding.refresh();
                }
            } catch (oError) {
                Log.warning("No se pudo refrescar la lista", oError.message, "RapHelper");
            }
        },

        // Borrado real (se envía de inmediato)
        borrar: async function (oContext) {
            _mensajes().removeAllMessages();
            await oContext.delete("$auto");
        },
    };
});