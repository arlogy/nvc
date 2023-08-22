# Changelog

## Next version

jsu updated to a new version (see documentation): all changes to the library
must be taken into account when accessing its APIs explicitly, i.e. not via nvc.

- Add `Nvc.fsm.parseFsmCsv(str, allowFullBlanks, allowDuplicates)` for parsing
CSV in FSM context.
- Add `Nvc.quick.revertOutputFocusListeners()` to revert `Nvc.quick.installOutputFocusListeners()`.
- Remove `Nvc.convertLatexShortcuts(text)` which should be replaced with `Jsu.Latex.convertLatexShortcuts(text)`.
- Remove `Nvc.getLatexShortcutPatterns()` which should be replaced with `Jsu.Latex.getLatexShortcutData()`,
keeping in mind the following changes for the properties of the returned object:
`greekLetter.specialChar` &rarr; `greekLetter.pattern.specialChar`,
`greekLetter.valueSource` &rarr; `greekLetter.pattern.list`,
`greekLetter.value`       &rarr; `greekLetter.pattern.value`,
`subscript.specialChar`   &rarr; `subscript.pattern.specialChar`,
`subscript.value`         &rarr; `subscript.pattern.value`.
- Update `Nvc.fsm.buildFsmTransitionTableHtml(model, htmlAttrs, indents)`: the
attributes provided in `htmlAttrs` will always be trimmed before use.
- Update PNG export: improved browser support; user prompted to save image.

## 0.9.0 - 2022/09/03

*Starting from `fsm.js` downloaded from the [website](https://madebyevan.com/fsm/)
showcasing the original project, here are the major changes made to the source
code. They took place in 2020 and have been refined over time, mainly in 2022
during spare time.*

- Refactoring
    - Refactor the source code to create a documented and tested API for
    third-party consumers. With that in mind, only bug fixes and new features
    will be mentionned below, not the functions added, removed or refactored for
    example.
- Bug fixes
    - Combine LaTeX subscripts next to each other when exporting to LaTeX. E.g.
    convert `_0_1_0` to `_{010}`. This fixes the *double script* error that
    occurs when the exported content is parsed by a LaTeX interpreter.
    - Rewrite LaTeX commands if necessary when exporting to LaTeX. E.g. convert
    `\alphaxy` to `\alpha{}xy`. This fixes the *undefined control sequence*
    error that occurs when the exported content is parsed by a LaTeX
    interpreter. Indeed, `\alpha` is a valid LaTeX command but not `\alphaxy`.
    - Define Greek letter commands that could not otherwise be processed if the
    exported content is parsed by a LaTeX interpreter. These commands include
    `\Alpha` and `\Epsilon` for example.
    - Correctly convert texts to LaTeX during export, including escaping special
    characters. E.g. `\` becomes `\backslash` (while preserving `\alpha` for
    example) and `$` becomes `\$`.
- New features
    - Add support for graphs in general, not just finite state machines.
    - Add and allow customization of visual attributes for each canvas item.
    These include opacity, text color and border color for example.
    - Add support for advanced caret/cursor positioning on the selected canvas
    item. This allows the cursor to be moved using the left/right arrow keys or
    the home/end keys (to move it to the beginning or end). This feature also
    allows to delete one LaTeX shortcut at a time (e.g. `\alpha`) instead of
    character by character, or to correctly recognize such a shortcut in a text
    when it is obtained after adding or deleting a character (e.g. create `\alpha`
    from `alpha` or `\alphba`).
    - Introduce the `TextItem` class to add automatically sized texts to the
    canvas. This is useful for adding explanations for example.
    - Introduce the FSM alphabet container and attach it to the canvas
    accordingly when resizing the window. This container is useful when creating
    a FSM for theoretical purposes.
    - Ignore characters that cannot be typed in the canvas during import/export
    for example.
    - Automatically move nodes and text items into the visible area of the
    canvas so that the user never has to find them. This happens when the canvas
    page is loaded.
    - Resize nodes using `Shift + MouseScroll` or `Shift + Enter`.
    - Add text items using `Ctrl + MouseDoubleClick`.
    - Easily remove all items from the canvas by clicking a single *Clear*
    button.
    - Easily move all nodes and arrows by dragging an empty area in the canvas.
    - Implement several utility functions such as parsing FSM alphabet,
    validating FSM or building FSM state-transition table.
