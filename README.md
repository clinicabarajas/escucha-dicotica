# Escucha dicótica · Clínica Barajas · V1.10

Plantilla web del Test de Dígitos Dicóticos (TDD). Introduce las respuestas de cualquiera de las tres listas y descarga informes PDF A4 verticales. Permite generar cada informe con identidad de Clínica Barajas o en formato neutro, sin logo ni mención institucional.

[Abrir la aplicación](https://clinicabarajas.github.io/escucha-dicotica/)

## Uso

1. Introduce los datos de la evaluación; la identificación es opcional.
2. Selecciona una lista y su modalidad. Marca los dígitos reconocidos. En atención focalizada, las marcas del oído no atendido son intrusiones.
3. Pulsa **Calcular informe** y confirma que has revisado los 27 ítems. Los dígitos sin marcar cuentan como 0.
4. Abre o descarga el PDF. Cada lista produce su propio informe; no es necesario realizar las tres.
5. Al completar las tres modalidades previstas se activa el **Informe 04**, que integra línea base, facilitación, supresión de intrusiones, asimetría y efecto de carga.
6. Pulsa **Nueva evaluación** para eliminar los datos de la sesión. Recargar o cerrar también los elimina.

El botón **Cargar ejemplo** introduce un caso clínico anonimizado con las respuestas de las tres listas, edad en el TDD, lateralidad e intensidades. Las fechas son sintéticas y solo sirven para calcular la edad. No añade nombre, identificador, fechas reales, examinador ni observaciones, y no calcula los informes automáticamente.

La herramienta puntúa respuestas obtenidas con el material de la prueba. No incluye audio ni administra estímulos.

## Privacidad

El cálculo y la generación del PDF se ejecutan íntegramente en el navegador. No hay servidor de datos, registro, base de datos, analítica, cookies de la aplicación, localStorage, sessionStorage ni IndexedDB. Los datos solo permanecen en memoria durante la sesión. La política CSP bloquea conexiones salientes y envío de formularios. Los archivos de la aplicación se cargan del mismo alojamiento, sin dependencias de CDN.

El PDF descargado se conserva en el dispositivo del usuario. El alojamiento GitHub Pages registra datos técnicos de visita, como la IP, según su política; la aplicación no transmite las respuestas ni los datos del participante. Véase [GitHub Pages: recopilación de datos](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection).

El repositorio contiene código, plantillas, valores de referencia publicados, el logo y un caso clínico resumido y anonimizado de demostración. No contiene nombres, números de historia, fechas reales, centro de procedencia, profesionales, datos familiares, datos individuales de la muestra normativa ni credenciales.

## Cálculo y referencia

Cada lista contiene 81 dígitos por oído: 18, 27 y 36 en las tres dificultades. Los porcentajes globales y por dificultad, los pares solapados y las posiciones reproducen las fórmulas de la plantilla original. IL = (OD − OI) / (OD + OI) × 100; si ambas puntuaciones son cero, IL = 0. El IL solo se muestra en atención dividida.

El Informe 04 aplica el índice de cambio `100 × (AF − LB) / (AF + LB)` y presenta por separado la facilitación del oído atendido y la supresión del oído competidor. Para que la reducción de intrusiones sea visualmente positiva, el informe invierte el signo del índice original en las medidas de supresión. También ofrece el cambio bruto en puntos porcentuales, omisiones, selectividad y resultados por carga. Es una comparación intraindividual descriptiva y no aporta percentiles ni puntos de corte para atención focalizada.

Referencia: Zenker Castro F, Suárez Suárez M, Marro Cosialls S, Barajas de Prat JJ. **La evaluación del procesamiento auditivo central: el test de dígitos dicóticos.** Revista de Logopedia, Foniatría y Audiología. 2007;27(2):74–85. [doi:10.1016/S0214-4603(07)70076-1](https://doi.org/10.1016/S0214-4603(07)70076-1).

Referencia de aplicación clínica: Zenker Castro F, Fernández Belda R, Barajas de Prat JJ. **Test de dígitos dicóticos. Estudio de un caso.** Acta Otorrinolaringológica Española. 2008;59(10):503–505. [doi:10.1016/S0001-6519(08)75521-3](https://doi.org/10.1016/S0001-6519(08)75521-3).

Se utilizan las medias y DT de la tabla 1 para atención dividida, por edad, oído y dificultad. z = (resultado − media) / DT. El percentil estimado es 100 × Φ(z), bajo aproximación normal, redondeado al entero, con extremos <1 y >99. **No son percentiles empíricos, no han sido validados como baremo independiente y no equivalen a un diagnóstico.** La banda representa media ±1 DT, no un punto de corte.

La muestra publicada era diestra y se evaluó a 65 dB nHL. No se aplica esta referencia a atención focalizada ni automáticamente a personas siniestras o ambidiestras. Grupos de la tabla: 6–12, 13–17, 18–34, 35–59 y >60 años. No se extrapola fuera de 6–72 años ni se asigna baremo a los 60 años, límite no definido expresamente en la tabla. No hay percentiles de la media bilateral ni del índice IL.

## Publicación y mantenimiento

Aplicación estática sin instalación ni compilación. Publica los archivos de la raíz mediante **Settings → Pages → Deploy from a branch → main / (root)** en GitHub. No se necesitan claves ni secretos.

Para revisar localmente, sirve esta carpeta con un servidor estático (por ejemplo, `python -m http.server 8765`) y abre `http://localhost:8765`. Los módulos no están pensados para abrir `index.html` directamente desde `file://`.

Pruebas sin dependencias: `node --test core.test.js` (Node 20 o posterior). Verifican denominadores, independencia de listas, ceros, pares solapados, edad, límites normativos, percentiles, estructura PDF y ausencia de mecanismos de persistencia/envío.

El logotipo pertenece a Clínica Barajas. La referencia bibliográfica se conserva en la web y en cada informe. Si se activa el formato neutro, el PDF no incorpora el logo ni menciones institucionales.

Los iconos vectoriales de cerebro y oído proceden de [Lucide](https://lucide.dev/) y se distribuyen con licencia ISC. El aviso completo se conserva en `THIRD_PARTY_NOTICES.md`.

## V1.10

- Sustitución del esquema artesanal por iconos vectoriales profesionales de cerebro y oído de Lucide.
- Oídos diferenciados según la convención audiológica: OD en rojo y OI en azul, con trayectorias diagonales más claras.
- Eliminada la frase redundante «Informe sin identidad institucional» del formato neutro.

## V1.9

- Ejemplo anónimo actualizado a 65 dB nHL en ambos oídos y en las tres listas.
- Opción para generar todos los PDF sin logo ni referencias institucionales de Clínica Barajas.
- Nuevo Informe 04 de dos páginas, disponible al completar las tres listas con modalidades e intensidades compatibles.
- Cálculos separados de facilitación, supresión de intrusiones, selectividad, omisiones y efecto de carga.
- Esquema cerebral vectorial con flechas funcionales y advertencia explícita de que no representa localización anatómica.
- Registro opcional de respuestas ajenas a los estímulos presentados.

## V1.8

- Añadido un panel de contexto clínico visible al cargar el ejemplo, con edad en la fecha del TDD, lateralidad e intensidades de presentación.
- La edad se calcula con fechas sintéticas; se omiten todos los identificadores y detalles clínicos innecesarios.

## V1.7

- Añadido **Cargar ejemplo** para rellenar las tres listas con respuestas anónimas de demostración.
- El ejemplo no incorpora datos identificativos, no se calcula automáticamente y puede eliminarse con **Nueva evaluación**.

## V1.6

- Identificador visible en la web y en cada PDF.
- OD en rojo (#c62828) y OI en azul (#1565c0), en respuestas, puntuaciones y gráficos. Los elementos de marca conservan el color de la clínica.
- Incorporada la referencia clínica de 2008. La referencia normativa continúa siendo la tabla 1 de 2007.
