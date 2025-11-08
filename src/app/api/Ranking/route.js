import { NextResponse } from "next/server";
import {GetRanking} from "@/lib/services/RankingServices";

async function GET(reg){
    let response;
    const params = reg.nextUrl.searchParams;
    const ano= params.get('ano');
    const mes= params.get('mes');
    try{
        const ranking = await GetRanking(ano,mes);
        response= NextResponse.json(ranking);
    }catch(ex){
        response = NextResponse.json({error:ex.message},{status:500});
    }
    return response;
}

export {GET};