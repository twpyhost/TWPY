import { NextResponse } from "next/server";
import {GetUsuarios, PostUsuario, DeleteUsuario} from "@/lib/services/UsuarioServices";

async function GET(){
    let response;
    try{
        const usuarios = await GetUsuarios();
        response= NextResponse.json(usuarios);
    }catch(ex){
        response = NextResponse.json({error:ex.message},{status:500});
    }
    return response;
}

async function POST(reg){
    let response;
    try
    {
        const body = await reg.json();
        await PostUsuario(body);
        response=NextResponse.json({message: "OK"},{status:201});
    }catch(ex)
    {
        response = NextResponse.json({error:ex.message},{status:500});
    }
    return response;
}

async function DELETE(reg){
    let response;
    try{
        const body = await reg.json();
        await DeleteUsuario(body);
        response = NextResponse.json({status:204});
    }catch(ex){
        response = NextResponse.json({error:ex.message},{status:500});
    }
    return response;
}

export {GET,POST,DELETE};