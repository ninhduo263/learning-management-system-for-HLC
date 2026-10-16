export class CreatePushOneSignalNotificationDto {
    include_player_ids?: string[];
    included_segments?: string[];
    headings?: Record<string, unknown>;
    contents?: Record<string, unknown>;
    chrome_big_picture?: string;
    adm_big_picture?: string;
    chrome_web_image?: string;
    data?: Record<string, unknown>;
}
