import { NextResponse } from "next/server";
import {GetUsuario} from "@/lib/services/UsuarioServices";

async function GET(_,{params}){
    let response;
    const {id} = await params;
    try{
        const detalle = await GetUsuario(id);
        response = NextResponse.json(detalle);
    }catch(err){
        response = NextResponse.json({error:"Participante no encontrado"},{status:404});
    }
    
    return response;
}

export {GET};