import { IsNotEmpty,IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RequestOtpDto {
    @ApiProperty({example:'+2348129316522',description:'Phone is in E.164 format'})
    @IsNotEmpty()
    @IsString()
    phone!:string;
}

