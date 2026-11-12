sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "ns/frontend/model/models"
], function (UIComponent, Device, JSONModel, models) {
    "use strict";

    return UIComponent.extend("ns.frontend.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            var oUiEstado = new JSONModel({
                tituloHeader: "",
                userName: "",
                saludo: "Cargando información del usuario...",
                esConsultor: false,
                esAdministrador: false,
                autenticacionFinalizada: false,
                errorAutenticacion: false,
                consultorUuid: "",
                usuarioUuid: "",
                perfil: ""
            });

            this.setModel(oUiEstado, "uiPantalla");

            this.setModel(
                models.createDeviceModel(),
                "device"
            );

            var sRutaClientes = this.getManifestObject()
                .resolveUri("model/clientes.json");

            this.setModel(
                new JSONModel(sRutaClientes),
                "modeloClientes"
            );

            // Inicializar el router conservando las rutas existentes
            this.getRouter().initialize();

            // Consultar la identidad real del usuario SAP
            this._cargarUsuarioActual();
        },

        _cargarUsuarioActual: async function () {
            var oEstado = this.getModel("uiPantalla");
            var oRouter = this.getRouter();

            try {
                var oOData = this.getModel();

                var oBinding = oOData.bindList(
                    "/MiUsuario",
                    undefined,
                    undefined,
                    undefined,
                    {
                        $select: "UsuarioUuid,IdentidadSso,ConsultorUuid,Perfil,Activo"
                    }
                );

                var aContextos = await oBinding.requestContexts(0, 2);

                if (aContextos.length !== 1) {
                    throw new Error(
                        "No se encontró un usuario SAP activo y único."
                    );
                }

                var oUsuario = await aContextos[0].requestObject();

                var sPerfil = String(
                    oUsuario.Perfil || ""
                ).trim().toUpperCase();

                var bAdministrador = sPerfil === "ADMINISTRADOR";
                var bConsultor = sPerfil === "CONSULTOR";

                if (!bAdministrador && !bConsultor) {
                    throw new Error("Perfil no reconocido: " + sPerfil);
                }

                oEstado.setData({
                    tituloHeader: bAdministrador
                        ? "Panel de administración"
                        : "Gestión de actividades",
                    userName: oUsuario.IdentidadSso,
                    saludo: "Bienvenido, " + oUsuario.IdentidadSso,
                    esConsultor: bConsultor,
                    esAdministrador: bAdministrador,
                    autenticacionFinalizada: true,
                    errorAutenticacion: false,
                    consultorUuid: oUsuario.ConsultorUuid || "",
                    usuarioUuid: oUsuario.UsuarioUuid,
                    perfil: sPerfil
                });

                // Redirigir solo cuando se está en la ruta inicial.
                // Las rutas protegidas se controlarán aparte.
                var sHash = sap.ui.core.routing.HashChanger
                    .getInstance()
                    .getHash();

                if (!sHash || sHash === "/") {
                    if (bAdministrador) {
                        oRouter.navTo(
                            "RoutePanelCumplimiento",
                            {},
                            true
                        );
                    } else {
                        oRouter.navTo(
                            "RouteCalendarioActividades",
                            {},
                            true
                        );
                    }
                }

            } catch (oError) {
                console.error(
                    "Error al identificar usuario SAP:",
                    oError
                );

                oEstado.setProperty(
                    "/autenticacionFinalizada",
                    true
                );

                oEstado.setProperty(
                    "/errorAutenticacion",
                    true
                );

                oEstado.setProperty(
                    "/saludo",
                    "No fue posible validar el perfil del usuario."
                );
            }
        }

    });
});
