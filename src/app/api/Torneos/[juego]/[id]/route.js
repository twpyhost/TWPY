import { NextResponse } from "next/server";
import {GetTorneo} from "@/lib/services/TorneoServices";

async function GET(_,{params}){
    let response;
    const {juego,id} = await params;
    try{
        const detalle = await GetTorneo(juego,id);
        response = NextResponse.json(detalle);
    }catch(err){
        response = NextResponse.json({error:"Torneo no encontrado"},{status:404});
    }
    
    return response;
}

export {GET};