# 📦 Sistema de Gestión de Inventario

¡Bienvenido! Este es el sistema de gestión que evitará que tu almacén se convierta en el Triángulo de las Bermudas. Desarrollado con **Vanilla JS** puro (sin frameworks pesados, solo músculo) y **PHP** artesanal.

## 🚀 ¿Qué hace esta maravilla?

* **🛒 Inventario gestion-Stock:** Crea, edita y elimina productos (si la base de datos te deja, claro).
* **🚨 Alerta de Pánico:** Si el stock baja del mínimo, te lo pone en **rojo** para que corras a comprar más.
* **🏢 Proveedores al Vuelo:** ¿No existe el proveedor? ¡Créalo sin salir del formulario de producto! Magia pura.
* **👀 Pedidos y Cotilleo:** Visualiza los pedidos y sus detalles con un modal elegante que no recarga la página.
* **🗑️ Borrado Inteligente:** El sistema protege tus datos. Si intentas borrar un producto con historial, te gritará (amablemente) que no puedes.

## 🛠️ Tecnologías (El stack "Old School Cool")

* **Frontend:** HTML5, CSS3, y JavaScript (ES6 Modules). Nada de React ni Vue, aquí picamos código de verdad.
* **Backend:** PHP (PDO para dormir tranquilos con las inyecciones SQL).
* **Base de Datos:** MySQL/MariaDB (donde vive la verdad).
* **Estilo:** CSS propio con un toque de "Dark Mode" en los botones.

## ⚡ Instalación Rápida (Para gente con prisa)

1.  **Clona o Descarga:** Tira esto en tu carpeta `htdocs` (si usas XAMPP) o `www`.
2.  **La Base de Datos:** Importa el script SQL en tu gestor favorito (phpMyAdmin, Workbench, DBeaver...).
3.  **Conecta los cables:** Revisa `dbConnectVanilla` o el archivo de configuración de PHP para asegurarte de que la contraseña no sea `1234` (o sí, tú sabrás).
4.  **¡A funcionar!**: Abre el navegador y disfruta.

## 🐛 "Features" conocidas (no son bugs)

* Si no puedes borrar un producto, **no está roto**. Es la **Integridad Referencial** protegiéndote de ti mismo (probablemente ese producto está en un pedido antiguo).
* Si los desplegables no cargan, asegúrate de haber pagado la factura de internet (o de que el backend esté corriendo).

## 👨‍💻 Autora

Creado con cafeína, paciencia y un poco de ayuda de una IA muy simpática.

---
*"En mi máquina funciona" - Lema oficial del proyecto.*