import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Entity } from "@module/repository";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Allow } from "class-validator";
import { compile } from "handlebars";
import _ from "lodash";
import mongoose from "mongoose";
import { IResult } from "ua-parser-js";

@Schema({ collection: Entity.AUDIT_LOG })
export class AuditLog implements BaseEntity {
    @StrObjectId()
    _id: string;

    @Allow()
    @Prop({ index: true })
    uId: string;

    @Allow()
    uCode: string;

    @Allow()
    uEmail: string;

    @Allow()
    @Prop()
    uName: string;

    @Allow()
    @Prop()
    requestType: string;

    @Allow()
    @Prop({ index: true })
    action: string;

    @Allow()
    @Prop({})
    description?: string;

    @Allow()
    @Prop({ index: true, sparse: true })
    sourceId?: string;

    @Allow()
    @Prop()
    logResponse?: boolean;

    @Allow()
    @Prop()
    logError?: boolean;

    @Allow()
    @Prop()
    ip?: string;

    @Allow()
    @Prop({ type: mongoose.Schema.Types.Mixed })
    data?: unknown;

    @Allow()
    @Prop({ type: mongoose.Schema.Types.Mixed })
    query?: unknown;

    @Allow()
    @Prop({ type: mongoose.Schema.Types.Mixed })
    param?: unknown;

    @Allow()
    @Prop({ type: mongoose.Schema.Types.Mixed })
    ua?: IResult;

    @Allow()
    @Prop()
    userAgent?: string;

    @Allow()
    @Prop({ type: mongoose.Schema.Types.Mixed })
    response?: unknown;

    @Allow()
    @Prop({ type: mongoose.Schema.Types.Mixed })
    error?: unknown;

    @Prop({ default: Date.now, index: true })
    createdAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.pre("save", function () {
    if (this.sourceId) {
        this.sourceId = _.get(this.toJSON(), this.sourceId) || null;
    }
    if (this.description) {
        this.description = compile(this.description)(this.toJSON()) || null;
    }
});
