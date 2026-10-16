import { PartialType } from "@nestjs/swagger";
import { CreateEventAccountDto } from "./create-event-account.dto";

export class UpdateEventAccountDto extends PartialType(CreateEventAccountDto) {}
