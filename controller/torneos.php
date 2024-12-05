<?php
/*$encode = base64_encode("TWPY_host:5UMETjQKS7VTbJjXDRyoUAUVEQwdgbuLNvcJhxtV");
$postencode = "VFdQWV9ob3N0OjVVTUVUalFLUzdWVGJKalhEUnlvVUFVVkVRd2RnYnVMTnZjSmh4dFY=";
echo $encode."<br />";
echo $postencode."<br />";
echo base64_decode($postencode);*/
/*$listatorneos = array("q4jzyjml","gj2nq531");

foreach($listatorneos as $torneo){
    $curl = curl_init();

    curl_setopt_array($curl, array(
    CURLOPT_URL => 'https://api.challonge.com/v1/tournaments/'.$torneo.'.json?include_participants=1',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'GET',
    CURLOPT_HTTPHEADER => array(
    'Authorization: Basic VFdQWV9ob3N0OjVVTUVUalFLUzdWVGJKalhEUnlvVUFVVkVRd2RnYnVMTnZjSmh4dFY='/*,
    'Cookie: __cf_bm=2pWDHHcdmpbukZZlC3YnLXE4eYWIQtu5.oJq8xHvLtE-1731172974-1.0.1.1-v09u2TXmg0S.W4.CNedMnO5HeJqITA1bCYy.A3OmGX7SwcHg2KRqwRczhfnWFf50bQgz9HLuvFP8dONYIdkFFg; _ck=true'*/
    /*//---DESDE ACA ESTA COMENTADO
    ),
    ));

    //curl_setopt($curl,CURLOPT_USERPWD,"TWPY_host:5UMETjQKS7VTbJjXDRyoUAUVEQwdgbuLNvcJhxtV");

    $response = curl_exec($curl);

    curl_close($curl);

    $datos = json_decode($response,true);
    $participantes=$datos["tournament"]["participants"];
    foreach($participantes as $part){
        echo "(".$part["participant"]["tournament_id"].",".$part["participant"]["challonge_user_id"].", ".$part["participant"]["final_rank"].");<br />";
        //var_dump($part);
    }
    var_dump($datos);
    echo "<br/>-----------------------<br/>";
}*/
//require_once("config/conexion.php");
require_once("models/torneos.php");

$valor= 15193348;
$result=new Torneos();
$datos = $result->getResultado($valor);
//require("view/torneos.php");
?>