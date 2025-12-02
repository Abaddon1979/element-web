/*
Context menu for picking a GIF from Tenor and sending it to the current room.
*/

import React, { type ChangeEvent, type JSX, type SyntheticEvent, useContext, useEffect, useState } from "react";
import { type IEventRelation } from "matrix-js-sdk/src/matrix";

import ContextMenu, { type MenuProps } from "../../structures/ContextMenu";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import ContentMessages from "../../../ContentMessages";
import { useScopedRoomContext } from "../../../contexts/ScopedRoomContext.tsx";
import { TimelineRenderingType } from "../../../contexts/RoomContext";
import { fetchTrendingGifs, searchGifs, type TenorGif } from "../../../utils/tenor";
import Spinner from "../elements/Spinner";
import AccessibleButton from "../elements/AccessibleButton";
import { _t } from "../../../languageHandler";

interface IProps {
    menuPosition: MenuProps;
    onFinished: (ev?: SyntheticEvent) => void;
    roomId: string;
    relation?: IEventRelation;
}

const GifPickerMenu: React.FC<IProps> = ({ menuPosition, onFinished, roomId, relation }): JSX.Element => {
    const mxClient = useContext(MatrixClientContext);
    const { timelineRenderingType } = useScopedRoomContext("timelineRenderingType");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<TenorGif[]>([]);
    const [loading, setLoading] = useState(false);

    // Load trending GIFs initially
    useEffect(() => {
        void loadTrending();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadTrending = async (): Promise<void> => {
        try {
            setLoading(true);
            const gifs = await fetchTrendingGifs(24);
            setResults(gifs);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Failed to load trending GIFs from Tenor", e);
        } finally {
            setLoading(false);
        }
    };

    const performSearch = async (text: string): Promise<void> => {
        const trimmed = text.trim();
        if (!trimmed) {
            await loadTrending();
            return;
        }

        try {
            setLoading(true);
            const gifs = await searchGifs(trimmed, 24);
            setResults(gifs);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Failed to search GIFs from Tenor", e);
        } finally {
            setLoading(false);
        }
    };

    const onSearchChange = (ev: ChangeEvent<HTMLInputElement>): void => {
        const value = ev.target.value;
        setQuery(value);
        void performSearch(value);
    };

    const onSelectGif = async (gif: TenorGif): Promise<void> => {
        if (!mxClient) return;

        try {
            setLoading(true);

            // Download the GIF data and upload it to the homeserver so it appears
            // inline in the timeline like a normal image message (Discord-style).
            const fetchUrl = gif.url;
            const res = await fetch(fetchUrl);
            if (!res.ok) {
                throw new Error(`Failed to download GIF: ${res.status}`);
            }
            const blob = await res.blob();
            const fileName = `gif-${gif.id || Date.now()}.gif`;
            const file = new File([blob], fileName, { type: blob.type || "image/gif" });

            await ContentMessages.sharedInstance().sendContentListToRoom(
                [file],
                roomId,
                relation,
                undefined,
                mxClient,
                timelineRenderingType ?? TimelineRenderingType.Room,
            );

            onFinished();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Failed to send GIF message", e);
            setLoading(false);
        }
    };

    return (
        <ContextMenu {...menuPosition} onFinished={onFinished} managed={false}>
            <div className="mx_GifPickerMenu">
                <input
                    className="mx_GifPickerMenu_search"
                    type="text"
                    value={query}
                    onChange={onSearchChange}
                    placeholder={_t("composer|gif_search_placeholder")}
                />

                {loading && (
                    <div className="mx_GifPickerMenu_loading">
                        <Spinner />
                    </div>
                )}

                <div className="mx_GifPickerMenu_grid">
                    {results.map((gif) => (
                        <AccessibleButton
                            key={gif.id}
                            className="mx_GifPickerMenu_item"
                            onClick={(): void => {
                                void onSelectGif(gif);
                            }}
                        >
                            {/* Use tiny variant for thumbnails when available */}
                            <img
                                className="mx_GifPickerMenu_thumbnail"
                                src={gif.tinyUrl ?? gif.url}
                                alt={gif.title ?? ""}
                            />
                        </AccessibleButton>
                    ))}
                </div>
            </div>
        </ContextMenu>
    );
};

export default GifPickerMenu;
