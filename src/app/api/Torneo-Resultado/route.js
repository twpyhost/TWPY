import { NextResponse } from "next/server";
import { DeleteResultado, GetAllResultados, PostResultado } from "@/lib/services/ResultadoServices";

async function GET(){
    let response;
    try{
        const torneos = await GetAllResultados();
        response= NextResponse.json(torneos);
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
        await PostResultado(body);
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
        await DeleteResultado(body);
        response = NextResponse.json({status:204});
    }catch(ex){
        response = NextResponse.json({error:ex.message},{status:500});
    }
    return response;
}

export {GET,POST,DELETE};