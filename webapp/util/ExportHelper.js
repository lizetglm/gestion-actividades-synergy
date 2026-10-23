sap.ui.define([], function() {
	"use strict";

	return {
        generarNombreArchivoConFecha: function (sPrefijo) {
            let oFechaActual = new Date();
            let sFecha = oFechaActual.getFullYear() + "-" + 
                         String(oFechaActual.getMonth() + 1).padStart(2, '0') + "-" + 
                         String(oFechaActual.getDate()).padStart(2, '0');
                         
            let sHora = String(oFechaActual.getHours()).padStart(2, '0') + 
                        String(oFechaActual.getMinutes()).padStart(2, '0');

            
            return sPrefijo + "_" + sFecha + "_" + sHora + ".xlsx";
        }
	};
});