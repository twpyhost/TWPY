document.getElementById('consult-btn').addEventListener('click', function() {
    document.getElementById('search-container').style.display = 'block';
});

document.getElementById('insert-btn').addEventListener('click', function() {
    document.getElementById('insert-container').style.display = 'block';
});

function search() {
    const query = document.getElementById('search-input').value;
    fetch('?page=torneos&action=search', {
        method: 'POST',
        body: new URLSearchParams({ query: query })
    })
    .then(response => response.json())
    .then(data => {
        const resultadosDiv = document.getElementById('Tabla');
        resultadosDiv.innerHTML = '';

        if (data.length === 0) {
            resultadosDiv.innerHTML = 'No se encontraron resultados.';
        } else {
            resultadosDiv.innerHTML=`Resultados del torneo ${data[0].Torneo_id}`;
            const tabla = document.createElement('table');
            tabla.setAttribute('border','1');
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>ID Torneo</th>
                    <th>Usuario</th>
                    <th>Posicion</th>
                    <th>Puntaje</th>
                </tr>
            `;
            tabla.appendChild(thead);
            const tbody = document.createElement('tbody');
            data.forEach(torneo => {
                const fila = document.createElement('tr');
                fila.innerHTML += `<td>${torneo.Torneo_id}</td>
                                   <td>${torneo.usuario_id}</td>
                                   <td>${torneo.posicion}</td>
                                   <td>${torneo.puntaje}</td>`;
                tbody.appendChild(fila);
            });
            tabla.appendChild(tbody);
            resultadosDiv.appendChild(tabla);
        }
    });
}
function insert() {
    const url = document.getElementById('insert-input').value;
    fetch('index.php?page=torneos&action=insert', {
        method: 'POST',
        body: new URLSearchParams({ url: url })
    })
    .then(response=>response.json())
    .then(data=>{
        const resultadosDiv = document.getElementById('Tabla');
        resultadosDiv.innerHTML='';
        resultadosDiv.innerHTML = `${data.resultado}`;
    });
}
