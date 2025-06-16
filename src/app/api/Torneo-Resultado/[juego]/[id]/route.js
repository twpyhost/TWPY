import { NextResponse } from "next/server";
import {GetResultadosTorneo} from "@/lib/services/ResultadoServices";

async function GET(_,{params}){
    let response;
    const {juego,id} = await params;
    try{
        const detalle = await GetResultadosTorneo(juego,id);
        response = NextResponse.json(detalle);
    }catch(err){
        response = NextResponse.json({error:"Resultados no encontrados"},{status:404});
    }
    
    return response;
}

export {GET};