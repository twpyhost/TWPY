import { NextResponse } from "next/server";
import {GetRanking} from "@/lib/services/RankingServices";

async function GET(){
    let response;
    try{
        const ranking = await GetRanking();
        response= NextResponse.json(ranking);
    }catch(ex){
        response = NextResponse.json({error:ex.message},{status:500});
    }
    return response;
}

export {GET};