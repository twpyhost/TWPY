<table border="1">
<thead>
<tr><td>usuario_id</td><td>posicion</td></tr>
</thead>
<tbody>
<?php
foreach($datos as $dato){
    echo "<tr>";
    echo "<td>".$dato["usuario_id"]."</td>";
    echo "<td>".$dato["posicion"]."</td>";
    echo "</tr>";
}
?>
</tbody>
</table>