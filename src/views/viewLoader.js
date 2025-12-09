export const loadView = async (fileName) => {
    const contentDiv = document.getElementById('app-content');

    try {
        // Carga normal para TODAS las páginas (incluida landing)
        const response = await fetch(`./src/pages/${fileName}.html`);
        
        if (!response.ok) throw new Error(`Error ${response.status}`);
        
        const html = await response.text();
        contentDiv.innerHTML = html;
        return true;

    } catch (error) {
        console.error(error);
        contentDiv.innerHTML = `<h2>Error 404: No se encuentra src/pages/${fileName}.html</h2>`;
        return false;
    }
};