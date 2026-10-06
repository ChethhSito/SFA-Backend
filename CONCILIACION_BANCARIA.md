# Conciliación de reportes bancarios en MAF

## Alcance implementado

El usuario carga un reporte `.xlsx` en **MAF → Validación de Pagos**. El navegador lee la primera hoja y envía las filas extraídas y las obligaciones MAF actuales al backend. `preview` clasifica cada fila; tras la revisión humana, `confirm` recalcula el resultado, guarda la importación y registra en `payments` solo las coincidencias. MAF cambia a **Validado** las obligaciones confirmadas y registra la acción en su auditoría local.

Se usa `read-excel-file` para leer el libro en el navegador y NestJS/Mongoose para conciliar y persistir. No hay descarga automática del banco, OCR de vouchers, robot de interfaz ni emisión automática de recibos.

## Formato admitido

- Archivo `.xlsx`, máximo 10 MB en la interfaz y entre 1 y 5000 filas de pagos.
- Primera hoja con encabezados del consolidado del Banco de la Nación: `N° Operación`, `Fecha`, `Cód. Tasa`, `Concepto / Servicio`, `N° Documento`, `Apellidos y Nombres` y `Monto (S/.)` en las posiciones usadas por el ejemplo.
- El archivo se lee en el navegador; la API recibe JSON con `fileName`, `rows` y `obligations`.

| Tasa del reporte | Concepto MAF | Monto del catálogo de prueba |
| --- | --- | ---: |
| `01844` | `MAT01` Matrícula | S/ 250 |
| `01845` | `ADM01` Admisión | S/ 120 |
| `01846` | `CER01` Certificado | S/ 50 |
| `01849` | `CON01` Constancia | S/ 30 |

Las tasas `01847`, `01848` y `01850` del archivo ficticio no tienen equivalencia MAF. No se validan automáticamente. Los montos se comparan en céntimos con el importe de la obligación y del voucher; una diferencia de fecha, DNI o concepto también bloquea la coincidencia. El número de operación admite el prefijo `OP-` en MAF.

## API y persistencia

- `POST /bank-reconciliation/preview`: no escribe. Devuelve `fingerprint`, `total`, `matches` y `results` con estado y detalle por fila.
- `POST /bank-reconciliation/confirm`: recibe además `expectedFingerprint` y `expectedObligationIds`; vuelve a evaluar el reporte. Devuelve los ID validados y `repeated` si la huella ya se importó.
- Swagger: `http://127.0.0.1:3001/api/docs`.
- `bankimports`: huella, nombre, filas normalizadas, resultado de cada fila, ID de obligaciones validadas y fecha de importación.
- `payments`: un pago aprobado por operación bancaria confirmada, con referencia a la obligación MAF. La clave `bankOperationKey` evita volver a insertar la misma operación y fecha.

Se guarda el contenido extraído y el resultado, **no los bytes del Excel original**. Cambiar el nombre del archivo sin alterar las filas no genera una nueva importación. Una carga repetida devuelve los ID de la importación anterior.

## Prueba manual con datos ficticios

1. Inicia MongoDB, el backend en `127.0.0.1:3001` y el frontend en `localhost:3000`.
2. En MAF, crea una obligación para DNI `54793519`, concepto `CON01` y S/ 30.
3. Registra un voucher para esa obligación: operación `308496` (también sirve `OP-308496`), fecha `2026-04-12`, Banco de la Nación y S/ 30. Debe quedar **En Proceso**.
4. En **Validación de Pagos**, carga el reporte consolidado ajustado y pulsa **Comparar**. La operación `308496` debe mostrar **Coincide**. Las filas sin voucher mostrarán **Sin voucher**; las tasas no mapeadas mostrarán **Sin mapeo**.
5. Pulsa **Confirmar e importar**. La obligación pasa a **Validado** y el pago queda en MongoDB; puede consultarse con `GET /payments` en Swagger. Repetir el mismo archivo no inserta otro pago.

La imagen del voucher es solo una referencia visual: actualmente sus datos se registran en el formulario MAF.

## Límites antes de producción

- Las obligaciones y estados MAF aún viven en `localStorage`; otra sesión o navegador no comparte una fuente autoritativa de obligaciones. La API recibe esa instantánea desde el cliente.
- Los endpoints de conciliación no tienen una guarda de autorización propia. La configuración actual del backend escucha en `127.0.0.1`; no se debe exponer este flujo a una red o Internet sin autenticación, permisos MAF y obligaciones mantenidas por el servidor.
- El Excel original no queda disponible para descarga o auditoría documental. Habría que guardarlo con una huella del archivo y una política de retención.
- No existe integración con el Banco de la Nación; los datos del ejemplo son ficticios.
