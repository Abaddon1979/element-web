/*
Button in the message composer toolbar that opens a Tenor GIF picker.
*/

import React, { type ReactNode, type SyntheticEvent, useContext } from "react";
import classNames from "classnames";
import { type IEventRelation } from "matrix-js-sdk/src/matrix";

import { _t } from "../../../languageHandler";
import { CollapsibleButton } from "./CollapsibleButton";
import { aboveLeftOf, useContextMenu, type MenuProps } from "../../structures/ContextMenu";
import { OverflowMenuContext } from "./MessageComposerButtons";
import GifPickerMenu from "./GifPickerMenu";

export interface IGifButtonProps {
    roomId: string;
    relation?: IEventRelation;
    menuPosition?: MenuProps;
}

const GifButton: React.FC<IGifButtonProps> = ({ roomId, relation, menuPosition }) => {
    const overflowMenuCloser = useContext(OverflowMenuContext);
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();

    const onFinished = (ev?: SyntheticEvent): void => {
        closeMenu(ev);
        overflowMenuCloser?.();
    };

    let contextMenu: ReactNode = null;
    if (menuDisplayed) {
        const position = menuPosition ?? (button.current && aboveLeftOf(button.current.getBoundingClientRect())) ?? {};

        contextMenu = (
            <GifPickerMenu
                menuPosition={position}
                onFinished={onFinished}
                roomId={roomId}
                relation={relation}
            />
        );
    }

    const className = classNames("mx_MessageComposer_button", {
        mx_MessageComposer_button_highlight: menuDisplayed,
    });

    return (
        <>
            <CollapsibleButton
                className={className}
                iconClassName="mx_MessageComposer_gif"
                onClick={openMenu}
                title={_t("common|gif")}
                inputRef={button}
            />
            {contextMenu}
        </>
    );
};

export default GifButton;
