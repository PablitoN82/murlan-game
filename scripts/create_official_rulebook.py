from pathlib import Path
from html import escape
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "output" / "pdf" / "La_Scala_dei_Quattro_Regni_Regolamento_Ufficiale.pdf"
HERO = ROOT / "public" / "hero-four-kings-v2.png"
LOGO = ROOT / "public" / "logo-four-realms-v6.png"
JOKER_RED = ROOT / "public" / "cards" / "joker_red_v4.webp"
JOKER_BLACK = ROOT / "public" / "cards" / "joker_black_v4.webp"

PAGE_W, PAGE_H = A4
MARGIN_X = 18 * mm
MARGIN_TOP = 20 * mm
MARGIN_BOTTOM = 18 * mm

INK = colors.HexColor("#17211d")
GREEN = colors.HexColor("#0d3028")
DEEP_GREEN = colors.HexColor("#071b17")
GOLD = colors.HexColor("#b98b3d")
LIGHT_GOLD = colors.HexColor("#e7d3a1")
IVORY = colors.HexColor("#f6f0df")
PAPER = colors.HexColor("#fbf8ef")
RED = colors.HexColor("#b01824")
MUTED = colors.HexColor("#64665f")
PALE_GREEN = colors.HexColor("#e8efe9")
PALE_RED = colors.HexColor("#f5e7e2")


def register_fonts():
    font_dir = Path(r"C:\WINDOWS\Fonts")
    pdfmetrics.registerFont(TTFont("Georgia", str(font_dir / "georgia.ttf")))
    pdfmetrics.registerFont(TTFont("Georgia-Bold", str(font_dir / "georgiab.ttf")))
    pdfmetrics.registerFont(TTFont("Georgia-Italic", str(font_dir / "georgiai.ttf")))
    pdfmetrics.registerFont(TTFont("Calibri", str(font_dir / "calibri.ttf")))
    pdfmetrics.registerFont(TTFont("Calibri-Bold", str(font_dir / "calibrib.ttf")))
    pdfmetrics.registerFont(TTFont("Segoe-Symbol", str(font_dir / "seguisym.ttf")))


register_fonts()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    "BookTitle", fontName="Georgia-Bold", fontSize=27, leading=31,
    textColor=GREEN, alignment=TA_CENTER, spaceAfter=5 * mm,
))
styles.add(ParagraphStyle(
    "Subtitle", fontName="Calibri", fontSize=11, leading=15,
    textColor=LIGHT_GOLD, alignment=TA_CENTER, tracking=1.4,
))
styles.add(ParagraphStyle(
    "H1x", fontName="Georgia-Bold", fontSize=19, leading=23,
    textColor=GREEN, spaceBefore=2 * mm, spaceAfter=4 * mm,
))
styles.add(ParagraphStyle(
    "H2x", fontName="Georgia-Bold", fontSize=13.2, leading=17,
    textColor=GREEN, spaceBefore=4 * mm, spaceAfter=2 * mm,
))
styles.add(ParagraphStyle(
    "H3x", fontName="Calibri-Bold", fontSize=10.5, leading=13,
    textColor=GOLD, spaceBefore=3 * mm, spaceAfter=1.5 * mm,
))
styles.add(ParagraphStyle(
    "Bodyx", fontName="Calibri", fontSize=9.7, leading=13.5,
    textColor=INK, spaceAfter=2.2 * mm,
))
styles.add(ParagraphStyle(
    "Smallx", fontName="Calibri", fontSize=8.2, leading=10.8,
    textColor=MUTED, spaceAfter=1.5 * mm,
))
styles.add(ParagraphStyle(
    "Calloutx", fontName="Calibri", fontSize=9, leading=12.5,
    textColor=INK, leftIndent=3 * mm, rightIndent=3 * mm,
))
styles.add(ParagraphStyle(
    "Quote", fontName="Georgia-Italic", fontSize=13, leading=18,
    textColor=GREEN, alignment=TA_CENTER, leftIndent=12 * mm,
    rightIndent=12 * mm, spaceBefore=3 * mm, spaceAfter=5 * mm,
))
styles.add(ParagraphStyle(
    "TOC", fontName="Calibri", fontSize=9.4, leading=13,
    textColor=INK, leftIndent=2 * mm, spaceAfter=1.2 * mm,
))
styles.add(ParagraphStyle(
    "TableHead", fontName="Calibri-Bold", fontSize=8.4, leading=10,
    textColor=IVORY, alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    "TableCell", fontName="Calibri", fontSize=7.8, leading=9.7,
    textColor=INK,
))
styles.add(ParagraphStyle(
    "TableCellBold", fontName="Calibri-Bold", fontSize=7.9, leading=9.7,
    textColor=INK,
))


def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])


def bullet(text):
    return P(f'<font color="#b98b3d">&#9670;</font>&nbsp;&nbsp;{text}', "Bodyx")


def callout(title, text, tone="gold"):
    bg = colors.HexColor("#f4ead0") if tone == "gold" else PALE_GREEN if tone == "green" else PALE_RED
    border = GOLD if tone == "gold" else GREEN if tone == "green" else RED
    cell = P(f"<b>{escape(title)}</b><br/>{text}", "Calloutx")
    table = Table([[cell]], colWidths=[PAGE_W - 2 * MARGIN_X])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.8, border),
        ("LINEBEFORE", (0, 0), (0, -1), 3, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    return table


class CardRow(Flowable):
    SUIT_COLOR = {"H": RED, "D": RED, "C": INK, "S": INK, "X": RED}
    SUIT_SYMBOL = {"H": "♥", "D": "♦", "C": "♣", "S": "♠", "X": "★"}

    def __init__(self, cards, caption="", valid=None, height=35 * mm):
        super().__init__()
        self.cards = cards
        self.caption = caption
        self.valid = valid
        self.width = PAGE_W - 2 * MARGIN_X
        self.height = height

    def draw(self):
        c = self.canv
        bg = PALE_GREEN if self.valid is True else PALE_RED if self.valid is False else colors.white
        border = GREEN if self.valid is True else RED if self.valid is False else LIGHT_GOLD
        c.setFillColor(bg)
        c.setStrokeColor(border)
        c.roundRect(0, 0, self.width, self.height, 4 * mm, fill=1, stroke=1)
        x = 6 * mm
        card_w, card_h = 20 * mm, 28 * mm
        overlap = 13 * mm if len(self.cards) > 6 else 17 * mm
        y = (self.height - card_h) / 2
        for index, spec in enumerate(self.cards):
            if spec == "ARROW" or (isinstance(spec, tuple) and spec[0] == "ARROW"):
                arrow_y = y + card_h / 2
                c.setStrokeColor(GREEN)
                c.setFillColor(GREEN)
                c.setLineWidth(1.4)
                c.line(x, arrow_y, x + 9 * mm, arrow_y)
                path = c.beginPath()
                path.moveTo(x + 9 * mm, arrow_y)
                path.lineTo(x + 6 * mm, arrow_y + 2.2 * mm)
                path.lineTo(x + 6 * mm, arrow_y - 2.2 * mm)
                path.close()
                c.drawPath(path, fill=1, stroke=0)
                x += 13 * mm
                continue
            rank, suit = spec if isinstance(spec, tuple) else spec.split(":")
            c.setFillColor(colors.white)
            c.setStrokeColor(colors.HexColor("#c7c2b4"))
            c.roundRect(x, y, card_w, card_h, 2.4 * mm, fill=1, stroke=1)
            color = self.SUIT_COLOR[suit]
            symbol = self.SUIT_SYMBOL[suit]
            c.setFillColor(color)
            c.setFont("Georgia-Bold", 7.7 if len(rank) > 2 else 9.5)
            c.drawString(x + 1.7 * mm, y + card_h - 4.7 * mm, rank)
            c.setFont("Segoe-Symbol", 8)
            c.drawString(x + 1.7 * mm, y + card_h - 8.6 * mm, symbol)
            c.setFont("Segoe-Symbol", 21 if suit != "X" else 18)
            c.drawCentredString(x + card_w / 2, y + 11.5 * mm, symbol)
            c.saveState()
            c.translate(x + card_w - 1.7 * mm, y + 3.2 * mm)
            c.rotate(180)
            c.setFont("Georgia-Bold", 7.7 if len(rank) > 2 else 9.5)
            c.drawString(0, 0, rank)
            c.restoreState()
            x += overlap
        if self.caption:
            c.setFillColor(INK)
            c.setFont("Calibri-Bold", 8)
            c.drawRightString(self.width - 5 * mm, 3.5 * mm, self.caption)


class TurnFlow(Flowable):
    def __init__(self):
        super().__init__()
        self.width = PAGE_W - 2 * MARGIN_X
        self.height = 34 * mm

    def draw(self):
        c = self.canv
        labels = [
            ("1", "PESCA", "mazzo o scarti"),
            ("2", "CALA", "apri o allunga"),
            ("3", "AZIONE", "blocca, libera, sostituisci"),
            ("4", "SCARTA", "termina il turno"),
        ]
        gap = 4 * mm
        w = (self.width - gap * 3) / 4
        for i, (n, title, note) in enumerate(labels):
            x = i * (w + gap)
            c.setFillColor(DEEP_GREEN if i in (0, 3) else GREEN)
            c.setStrokeColor(GOLD)
            c.roundRect(x, 2 * mm, w, 28 * mm, 3 * mm, fill=1, stroke=1)
            c.setFillColor(GOLD)
            c.setFont("Georgia-Bold", 15)
            c.drawCentredString(x + w / 2, 20 * mm, n)
            c.setFillColor(IVORY)
            c.setFont("Calibri-Bold", 8.5)
            c.drawCentredString(x + w / 2, 14 * mm, title)
            c.setFillColor(LIGHT_GOLD)
            c.setFont("Calibri", 6.8)
            c.drawCentredString(x + w / 2, 9 * mm, note)
            if i < 3:
                c.setFillColor(GOLD)
                c.setFont("Georgia-Bold", 12)
                c.drawCentredString(x + w + gap / 2, 14 * mm, "›")


class CircularRun(Flowable):
    def __init__(self):
        super().__init__()
        self.width = PAGE_W - 2 * MARGIN_X
        self.height = 30 * mm

    def draw(self):
        c = self.canv
        ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
        step = self.width / len(ranks)
        y = 16 * mm
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.2)
        c.line(step / 2, y, self.width - step / 2, y)
        for i, rank in enumerate(ranks):
            x = i * step + step / 2
            c.setFillColor(DEEP_GREEN if rank in ("J", "Q", "K") else GREEN)
            c.circle(x, y, 4.2 * mm, fill=1, stroke=0)
            c.setFillColor(IVORY)
            c.setFont("Calibri-Bold", 7.5)
            c.drawCentredString(x, y - 2.3, rank)
        c.setFillColor(MUTED)
        c.setFont("Calibri", 7.4)
        c.drawCentredString(self.width / 2, 4 * mm, "L'Asso è il ponte: precede il 2 e segue un Re in posizione naturale.")


class JokerPair(Flowable):
    def __init__(self):
        super().__init__()
        self.width = PAGE_W - 2 * MARGIN_X
        self.height = 49 * mm

    def draw(self):
        c = self.canv
        card_w, card_h, gap = 29 * mm, 42 * mm, 12 * mm
        start = (self.width - card_w * 2 - gap) / 2
        for index, color in enumerate((INK, RED)):
            x = start + index * (card_w + gap)
            y = 4 * mm
            c.setFillColor(colors.white)
            c.setStrokeColor(colors.HexColor("#c7c2b4"))
            c.roundRect(x, y, card_w, card_h, 3 * mm, fill=1, stroke=1)
            c.setFillColor(color)
            c.setFont("Segoe-Symbol", 9)
            c.drawString(x + 2 * mm, y + card_h - 5 * mm, "★")
            c.drawRightString(x + card_w - 2 * mm, y + card_h - 5 * mm, "★")
            c.setFont("Segoe-Symbol", 23)
            c.drawCentredString(x + card_w / 2, y + 23 * mm, "★")
            c.setFont("Calibri-Bold", 8)
            c.drawCentredString(x + card_w / 2, y + 13 * mm, "JOLLY")
            c.setFont("Segoe-Symbol", 9)
            c.drawString(x + 2 * mm, y + 3 * mm, "★")
            c.drawRightString(x + card_w - 2 * mm, y + 3 * mm, "★")


class BlockDiagram(Flowable):
    def __init__(self):
        super().__init__()
        self.width = PAGE_W - 2 * MARGIN_X
        self.height = 43 * mm

    def draw_card(self, c, x, y, label, color=RED, angle=0):
        card_w = 20 * mm
        card_h = 28 * mm
        rank, suit = label[:-1], label[-1]
        c.saveState()
        c.translate(x + card_w / 2, y + card_h / 2)
        c.rotate(angle)
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.HexColor("#bbb5a7"))
        c.roundRect(-card_w / 2, -card_h / 2, card_w, card_h, 2.4 * mm, fill=1, stroke=1)
        c.setFillColor(color)
        c.setFont("Georgia-Bold", 9.5)
        c.drawString(-card_w / 2 + 1.7 * mm, card_h / 2 - 4.7 * mm, rank)
        c.setFont("Segoe-Symbol", 8)
        c.drawString(-card_w / 2 + 1.7 * mm, card_h / 2 - 8.6 * mm, suit)
        c.setFont("Segoe-Symbol", 21)
        c.drawCentredString(0, -1.5 * mm, suit)
        c.saveState()
        c.translate(card_w / 2 - 1.7 * mm, -card_h / 2 + 3.2 * mm)
        c.rotate(180)
        c.setFont("Georgia-Bold", 9.5)
        c.drawString(0, 0, rank)
        c.restoreState()
        c.restoreState()

    def draw(self):
        c = self.canv
        halves = [0, self.width / 2 + 3 * mm]
        for idx, x0 in enumerate(halves):
            c.setFillColor(PALE_RED if idx == 0 else PALE_GREEN)
            c.setStrokeColor(RED if idx == 0 else GREEN)
            c.roundRect(x0, 0, self.width / 2 - 3 * mm, self.height, 3 * mm, fill=1, stroke=1)
            base = x0 + 7 * mm
            for j, label in enumerate(["8♥", "9♥", "10♥"]):
                self.draw_card(c, base + j * 13 * mm, 9 * mm, label)
            self.draw_card(c, base + 31 * mm, 7.5 * mm, "K♦", RED, -28 if idx == 0 else 28)
            c.setFont("Calibri-Bold", 8.5)
            c.setFillColor(RED if idx == 0 else GREEN)
            c.drawRightString(
                x0 + self.width / 2 - 6 * mm,
                34 * mm,
                "BLOCCATA" if idx == 0 else "LIBERATA",
            )


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        page_count = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(page_count)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        if self._pageNumber == 1:
            return
        self.setFont("Calibri", 7.5)
        self.setFillColor(MUTED)
        self.drawCentredString(PAGE_W / 2, 8 * mm, f"{self._pageNumber} / {page_count}")


def cover_page(c, doc):
    c.saveState()
    c.setFillColor(DEEP_GREEN)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    hero_ratio = 907 / 1734
    hero_h = PAGE_W * hero_ratio
    c.drawImage(str(HERO), 0, PAGE_H - hero_h, PAGE_W, hero_h, mask="auto")
    c.setFillColor(colors.Color(0.02, 0.08, 0.07, alpha=0.36))
    c.rect(0, PAGE_H - hero_h, PAGE_W, hero_h, fill=1, stroke=0)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(20 * mm, PAGE_H - hero_h - 7 * mm, PAGE_W - 20 * mm, PAGE_H - hero_h - 7 * mm)
    logo_size = 43 * mm
    c.drawImage(str(LOGO), (PAGE_W - logo_size) / 2, PAGE_H - hero_h - 58 * mm, logo_size, logo_size, mask="auto")
    c.setFillColor(IVORY)
    c.setFont("Georgia-Bold", 25)
    c.drawCentredString(PAGE_W / 2, 73 * mm, "LA SCALA DEI")
    c.drawCentredString(PAGE_W / 2, 61 * mm, "QUATTRO REGNI")
    c.setFillColor(GOLD)
    c.setFont("Calibri-Bold", 11)
    c.drawCentredString(PAGE_W / 2, 48 * mm, "REGOLAMENTO UFFICIALE")
    c.setFillColor(LIGHT_GOLD)
    c.setFont("Georgia-Italic", 9.5)
    c.drawCentredString(PAGE_W / 2, 37 * mm, "Quattro semi. Due contendenti. Un solo dominio.")
    c.setFillColor(colors.HexColor("#a7a99f"))
    c.setFont("Calibri", 7.5)
    c.drawCentredString(PAGE_W / 2, 18 * mm, "Edizione ufficiale - luglio 2026")
    c.restoreState()


def content_page(c, doc):
    c.saveState()
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(DEEP_GREEN)
    c.rect(0, PAGE_H - 14 * mm, PAGE_W, 14 * mm, fill=1, stroke=0)
    c.setFont("Georgia-Bold", 7.5)
    c.setFillColor(LIGHT_GOLD)
    c.drawString(MARGIN_X, PAGE_H - 9 * mm, "LA SCALA DEI QUATTRO REGNI")
    c.setFont("Calibri", 7)
    c.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 9 * mm, "REGOLAMENTO UFFICIALE")
    c.setStrokeColor(GOLD)
    c.line(MARGIN_X, 13 * mm, PAGE_W - MARGIN_X, 13 * mm)
    c.restoreState()


def score_table():
    rows = [
        ["Categoria", "Condizione finale", "Punti"],
        ["Combinazione", "3 carte consecutive; incompleta e vulnerabile", "0"],
        ["Scala Bloccata", "Combinazione vulnerabile sigillata da un Re avversario; penalità al proprietario", "-20"],
        ["Scala Matta", "Almeno 4 carte; Jolly necessario; nessuna figura", "20"],
        ["Scala di Re Umile", "K incastonato come valore mancante; almeno 4 naturali oltre al K", "10"],
        ["Re Sovrano", "K dello stesso seme fuori sequenza su una combinazione valida", "25"],
        ["Re Sovrano Matto", "K come Re Sovrano con Jolly necessario", "15"],
        ["Matta Militare", "J naturale più alto; Jolly necessario", "25"],
        ["Scala Naturale", "Almeno 4 naturali; nessuna figura", "30"],
        ["Matta con Regina", "Q naturale più alta; Jolly necessario", "30"],
        ["Scala Militare", "J naturale più alto", "35"],
        ["Matta col Re", "Scala Suprema con K naturale e un Jolly necessario nella sequenza", "40"],
        ["Scala Regina", "Q naturale più alta", "40"],
        ["Scala Suprema", "K naturale in posizione; sequenza completa", "50"],
        ["Scala del Regno", "12 carte naturali distinte dello stesso seme; conclude la mano", "500"],
        ["Conquista del Regno", "13 carte naturali distinte dello stesso seme; conclude il match", "1.000"],
    ]
    data = [[P(cell, "TableHead") for cell in rows[0]]]
    for row in rows[1:]:
        data.append([P(row[0], "TableCellBold"), P(row[1], "TableCell"), P(row[2], "TableCellBold")])
    table = Table(data, colWidths=[39 * mm, 106 * mm, 18 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1eee4")]),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#c9c2b0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.1 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.1 * mm),
        ("ALIGN", (-1, 1), (-1, -1), "CENTER"),
    ]))
    return table


def quick_table():
    rows = [
        ["Situazione", "Regola immediata"],
        ["Pesca dal mazzo", "Prendi 1 carta."],
        ["Pesca dagli scarti", "Prendi la scelta e tutte quelle sopra; usa la scelta entro il turno."],
        ["Nuova combinazione", "Almeno 3 carte consecutive dello stesso seme; massimo 1 Jolly."],
        ["Scala completa", "Almeno 4 carte, oppure Re Sovrano."],
        ["Blocco", "Re di seme diverso su 3 carte, oppure su 4 carte se una è un Jolly."],
        ["Duello", "Re Legittimo più un rinforzo segreto; eserciti e Fato decidono l'esito."],
        ["Sacrificio", "Si compie con il Rito dei Tre Sigilli: offri 3 naturali del seme e catturi l'Invasore."],
        ["Sostituzione Jolly", "Carta naturale esatta; il Jolly recuperato va ricalato entro il turno."],
        ["Obbligo di aggancio", "ON: una carta subito agganciabile va usata, salvo le eccezioni anti-stallo. OFF: scarto libero delle non-K."],
        ["Scarto", "Le carte non-K seguono l'opzione Obbligo di aggancio; il K soltanto mediante l'Esilio del Re."],
        ["Re Umile", "K incastonato come valore mancante; non può essere preso e perde temporaneamente i poteri del Re."],
        ["Terra d'Esilio", "Area pubblica dei K esiliati; al massimo un K può esservi deposto per turno."],
        ["Richiamo", "Al posto della pesca; K usato subito su combinazione o scala valida del suo seme."],
        ["Decisione del Fato", "Rivela una carta neutrale dal mazzo, la pone sugli scarti e conclude il turno."],
        ["Carta vincolata", "Il giocatore vincolato può riprenderla direttamente soltanto mediante Recupero singolo."],
        ["Recupero singolo", "Prendi soltanto la carta vincolata, usala subito e lascia lo scarto al Fato."],
        ["Continuità della Mano", "Senza chiusura valida l'ultima carta resta in mano e interviene il Fato."],
        ["Più K residui", "Si può esiliare al massimo un K; gli altri restano in mano."],
        ["Chiusura", "4 semi, 3 scale complete, massimo 1 bloccata, scarto finale consentito."],
        ["Traguardi del Regno", "12/13 = 500 e fine mano; 13/13 = 1.000 e vittoria del match."],
    ]
    data = [[P(cell, "TableHead") for cell in rows[0]]]
    for row in rows[1:]:
        data.append([P(row[0], "TableCellBold"), P(row[1], "TableCell")])
    table = Table(data, colWidths=[48 * mm, 115 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1eee4")]),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#c9c2b0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.7 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.7 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.2 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2 * mm),
    ]))
    return table


def build_story():
    s = [PageBreak()]

    s += [
        P("Un gioco di strategia, rivalità e fato", "H1x"),
        P("La Scala dei Quattro Regni è un gioco di carte per due contendenti. Ogni giocatore sviluppa una sola scala per ciascuno dei quattro semi, ostacola l'avversario con i Re e tenta di dominare il tavolo attraverso combinazioni sempre più potenti.", "Bodyx"),
        P("«La strategia governa le scelte, ma la fortuna resta talvolta decisiva: è il fato, infine, a tracciare il destino di ogni Regno.»", "Quote"),
        callout("Versione ufficiale", "Questo manuale definisce le regole della versione digitale e costituisce il riferimento per il gioco cartaceo. In caso di dubbio prevalgono le definizioni, le priorità e gli esempi qui riportati.", "green"),
        Spacer(1, 5 * mm),
        P("Indice", "H2x"),
    ]
    toc = [
        ("1", "Componenti, termini e obiettivo"),
        ("2", "Preparazione e struttura del turno"),
        ("3", "Pesca dal monte degli scarti"),
        ("4", "Combinazioni e sequenza circolare"),
        ("5", "Blocco, liberazione e Battaglia del Regno Mancante"),
        ("6", "Jolly e sostituzione"),
        ("7", "Scarto, anti-blocco e chiusura"),
        ("8", "Categorie e punteggi"),
        ("9", "Dominio, Conquiste e vittoria"),
        ("10", "Esempi completi e casi limite"),
        ("11", "Consultazione rapida"),
    ]
    s += [P(f"<b>{n}.</b>&nbsp;&nbsp;{title}", "TOC") for n, title in toc]
    s += [
        Spacer(1, 5 * mm),
        P("Principi di interpretazione", "H2x"),
        bullet("<b>Mano</b>: singola distribuzione, dalla preparazione al conteggio."),
        bullet("<b>Partita o match</b>: insieme di più mani fino alla vittoria."),
        bullet("<b>Combinazione</b>: scala di 3 carte, valida ma ancora incompleta."),
        bullet("<b>Scala completa</b>: scala che assegna punti, normalmente da 4 carte."),
        bullet("<b>Carta naturale</b>: qualsiasi carta diversa dal Jolly."),
        bullet("<b>Posizione naturale</b>: posto occupato da una carta nella sequenza circolare."),
    ]

    s += [PageBreak(), P("1. Componenti, termini e obiettivo", "H1x")]
    s += [
        P("<b>Giocatori:</b> esattamente 2.", "Bodyx"),
        P("<b>Mazzo:</b> 52 carte francesi, tredici per ciascun seme, più 2 Jolly. Totale: 54 carte.", "Bodyx"),
        P("<b>Semi e ordine di riferimento:</b> Cuori, Quadri, Fiori, Picche.", "Bodyx"),
        P("<b>Obiettivo ordinario:</b> raggiungere almeno 1.000 punti con almeno 50 punti di vantaggio sull'avversario. Se, al termine di una mano, il vantaggio è inferiore, si gioca una nuova mano.", "Bodyx"),
        P("<b>Traguardi speciali:</b> una Scala del Regno con 12 carte naturali dello stesso seme assegna 500 punti e conclude la mano; se il totale raggiunge almeno 1.000 punti, conclude anche il match. La Conquista del Regno con tutte le 13 naturali assegna 1.000 punti e conclude sempre il match, senza richiedere 50 punti di vantaggio.", "Bodyx"),
        callout("Informazione perfetta, mani segrete", "Il tavolo, gli scarti e il numero di carte dell'avversario sono pubblici. La mano di ciascun giocatore resta segreta. Nella versione digitale lo stato è custodito dal server e ogni mossa è convalidata prima di essere applicata.", "green"),
        P("Preparazione", "H2x"),
        bullet("Mescola tutte le 54 carte."),
        bullet("Distribuisci 7 carte coperte a ciascun giocatore."),
        bullet("Colloca il mazzo coperto al centro."),
        bullet("Scopri 1 carta per iniziare il monte degli scarti."),
        bullet("La prima mano è iniziata dal giocatore che crea la stanza. Nelle mani successive il primo giocatore si alterna, indipendentemente dal vincitore della mano precedente."),
        callout("Configurazione della partita", "Il preset Classico attiva Re Umile e Obbligo di aggancio. Nella partita personalizzata queste due regole possono essere attivate separatamente. Terra d'Esilio, Decisione del Fato e tutte le regole anti-stallo appartengono invece al motore strutturale e restano sempre attive.", "green"),
        callout("Carta speciale iniziale", "Se la prima carta scoperta è un Re o un Jolly, il primo giocatore può prenderla e conservarla. Non deve usarla nel turno e scarta normalmente un'altra carta. L'eccezione vale soltanto per la carta scoperta durante la preparazione.", "gold"),
    ]

    s += [PageBreak(), P("2. Struttura del turno", "H1x"), TurnFlow()]
    s += [
        P("Ogni turno segue sempre lo stesso ritmo.", "Bodyx"),
        P("1. Pesca", "H2x"),
        P("Scegli una sola fonte: una carta dal mazzo coperto oppure una carta dal monte degli scarti. Non puoi pescare da entrambe.", "Bodyx"),
        P("2. Cala e sviluppa", "H2x"),
        P("Puoi aprire una combinazione, estendere una tua scala, sostituire un Jolly, convocare un Duello, compiere un Sacrificio attraverso il Rito dei Tre Sigilli o bloccare una combinazione avversaria quando le condizioni lo permettono. Le azioni consentite possono essere eseguite in qualunque ordine dopo la pesca, salvo gli obblighi specifici.", "Bodyx"),
        P("3. Concludi il turno", "H2x"),
        P("Il turno termina con uno scarto ordinario oppure con una conclusione speciale prevista: Recupero singolo, Esilio, Richiamo, Decisione del Fato, Duello, Sacrificio mediante il Rito dei Tre Sigilli o Regola di Continuità della Mano. La chiusura della mano può avvenire anche mediante l'Esilio finale del K.", "Bodyx"),
        callout("Obbligo di aggancio", "Se l'opzione è attiva, una carta non-K immediatamente agganciabile a una propria scala deve essere usata, salvo che una regola anti-stallo o la continuità della mano richiedano di conservarla o offrirla agli scarti. Se l'opzione è disattivata, le carte non-K possono essere scartate liberamente. Il K non entra mai nel monte degli scarti.", "red"),
        P("Mazzo esaurito", "H2x"),
        P("Se il mazzo termina, conserva visibile la carta in cima agli scarti, mescola tutte le altre carte del monte e forma un nuovo mazzo coperto. Il gioco prosegue senza interrompere la mano.", "Bodyx"),
    ]

    s += [PageBreak(), P("3. Pesca dal monte degli scarti", "H1x")]
    s += [
        P("Puoi scegliere qualsiasi carta visibile del monte. Se non scegli quella in cima, raccogli anche tutte le carte poste sopra di essa. Le carte sottostanti rimangono nel monte.", "Bodyx"),
        CardRow([("K", "H"), ("8", "D"), ("9", "C"), ("A", "H"), ("K", "D")], "dal basso verso l'alto", None),
        P("Se scegli <b>8 di Quadri</b>, raccogli 8 di Quadri, 9 di Fiori, Asso di Cuori e Re di Quadri. Il Re di Cuori resta nel monte e diventa la nuova carta visibile.", "Bodyx"),
        callout("Obbligo della carta scelta", "La carta che hai indicato deve essere usata entro la fine dello stesso turno in una nuova combinazione, in un aggancio, in un blocco, in un Duello, in una sostituzione o nel Rito dei Tre Sigilli. Puoi compiere altre azioni prima di usarla, ma non puoi scartare o passare il turno finché l'obbligo non è soddisfatto.", "gold"),
        P("Le altre carte raccolte entrano liberamente nella mano. Dopo aver soddisfatto l'obbligo puoi continuare il turno e infine scartare.", "Bodyx"),
        P("Carta vincolata e diritto di prima scelta", "H2x"),
        P("Il vincolo si determina esclusivamente verificando se la carta scartata può essere agganciata subito a una scala già presente. Non si considerano nuove combinazioni, Blocchi, Duelli, Riti, sostituzioni del Jolly o possibilità future.", "Bodyx"),
        bullet("Se la carta è utile soltanto a chi la scarta, resta vincolata a quel giocatore."),
        bullet("Se è utile a entrambi, resta vincolata a chi l'ha scartata: aveva la prima possibilità di usarla e vi ha rinunciato."),
        bullet("Se è utile soltanto all'avversario, gli viene offerta senza vincolo. Se pesca dal mazzo o compie un'altra pesca speciale lasciandola nel monte, la carta diventa vincolata a lui."),
        bullet("Se non è utile a nessuno, resta neutrale."),
        P("La carta vincolata è spostata verticalmente verso il giocatore interessato e reca il suo colore e il suo nome. L'indicazione deve restare visibile anche nella consultazione completa del monte.", "Bodyx"),
        bullet("L'avversario può usarla come normale punto di presa, raccogliendola insieme a tutte le carte poste sopra."),
        bullet("Il giocatore al quale la carta è vincolata può recuperarla direttamente soltanto mediante il Recupero singolo."),
        bullet("Se il giocatore vincolato sceglie una carta più in basso, raccoglie normalmente anche la propria carta vincolata e tutte quelle poste sopra."),
        P("Recupero singolo e Decisione del Fato", "H2x"),
        P("Nel recupero singolo il giocatore prende esclusivamente la carta vincolata orientata verso di lui, lasciando nel monte degli scarti tutte le altre carte. Deve calarla immediatamente in una nuova combinazione valida oppure agganciarla a una propria scala. Non può conservarla nella mano.", "Bodyx"),
        P("Dopo averla utilizzata non effettua il normale scarto dalla mano. Interviene invece la <b>Decisione del Fato</b>: la prima carta del mazzo viene rivelata con una cerimonia dedicata e collocata scoperta, in posizione centrale, in cima al monte degli scarti.", "Bodyx"),
        callout("Effetto della Decisione del Fato", "Quando viene rivelata dal mazzo, la carta è neutrale e non viene attribuita ad alcun giocatore. Non può essere usata nello stesso turno da chi l'ha scoperta; diventa disponibile per l'avversario. Se in un turno successivo viene raccolta e poi scartata normalmente, torna soggetta alle normali regole del vincolo. Dopo «Accetta il Destino» il turno termina.", "green"),
        P("Annullare una presa", "H2x"),
        P("Se hai selezionato per errore una carta del monte degli scarti, puoi annullare l'intera presa prima di compiere qualunque azione sul tavolo. Tutte le carte raccolte devono trovarsi ancora nella tua mano.", "Bodyx"),
        callout("Effetti dell'annullamento", "Le carte raccolte vengono rimesse nel monte nello stesso ordine in cui si trovavano; la mano torna alla situazione precedente alla presa e il turno riparte dalla fase di pesca. Dopo una calata, un aggancio, un Blocco, un Duello, il Rito dei Tre Sigilli o una sostituzione del Jolly, la presa non può più essere annullata.", "green"),
        P("Terra d'Esilio", "H2x"),
        P("Il K non viene mai scartato nel monte degli scarti. Prima dell'Esilio il giocatore deve poter scegliere ogni suo impiego legale: carta naturale, Re Sovrano, Re Umile, Blocco, Duello, Alleanza, rinforzo o altro potere consentito. Soltanto alla conclusione del turno si valutano i K rimasti inutilizzati.", "Bodyx"),
        P("L'<b>Esilio di Necessità</b> permette di deporre esattamente un solo K per turno nella Terra d'Esilio, area pubblica, comune e separata da mazzo, scarti, mano, tavolo, Corte e Prigionieri. Gli altri K restano nella mano. Non si pescano carte sostitutive.", "Bodyx"),
        bullet("Se rimane un solo K e la chiusura è valida, il K viene esiliato come carta finale e la chiusura assegna il normale bonus."),
        bullet("Se rimane un solo K e la chiusura non è valida, il K resta in mano e interviene la Decisione del Fato."),
        bullet("Con due o più K si esilia esattamente un K; gli altri restano in mano e interviene la Decisione del Fato."),
        bullet("Con uno o più K e una sola carta non-K puoi scartare la carta non-K conservando tutti i K, oppure esiliare un solo K, conservare ogni altra carta e affidarti alla Decisione del Fato."),
        P("Richiamo dall'Esilio", "H2x"),
        P("All'inizio del proprio turno, al posto della pesca, un giocatore può richiamare un K esiliato soltanto se possiede già una combinazione o scala valida dello stesso seme e può utilizzarlo immediatamente: nella posizione naturale, come Re Sovrano oppure come Re Legittimo in un Duello relativo a quella combinazione bloccata. Il K richiamato non entra mai nella mano e non può essere conservato, scartato, usato come Re Invasore, rinforzo o alleato.", "Bodyx"),
        P("Dopo un richiamo ordinario interviene la Decisione del Fato. Se il K richiamato viene impiegato in un Duello, si applicano queste eccezioni agli esiti ordinari: una vittoria del Re Legittimo è seguita dalla Decisione del Fato; una vittoria del Re Invasore rende il K Prigioniero senza Fato; in parità il K torna nella Terra d'Esilio e il blocco rimane.", "Bodyx"),
    ]

    s += [PageBreak(), P("4. Combinazioni e sequenza circolare", "H1x"), CircularRun()]
    s += [
        P("Per aprire una combinazione servono almeno 3 carte consecutive dello stesso seme. È ammesso al massimo 1 Jolly, dichiarato come il valore mancante. Non sono ammessi valori ripetuti né interruzioni nella sequenza.", "Bodyx"),
        CardRow([("4", "H"), ("5", "H"), ("6", "H")], "valida: stesso seme e valori consecutivi", True),
        Spacer(1, 2 * mm),
        CardRow([("4", "H"), ("5", "D"), ("6", "H")], "non valida: semi diversi", False),
        Spacer(1, 2 * mm),
        CardRow([("4", "C"), ("6", "C"), ("7", "C")], "non valida: manca il 5", False),
        P("Tre carte aprono, quattro completano", "H2x"),
        P("Una combinazione di 3 carte può essere calata ma vale 0 punti ed è vulnerabile al Blocco. Una scala di 4 carte è vulnerabile soltanto se contiene un Jolly. Con 4 carte naturali, oppure da 5 carte in su, la scala è consolidata e non può più essere bloccata. Il Re Sovrano costituisce un'eccezione e completa una combinazione di 3 carte per 25 punti.", "Bodyx"),
        P("Una sola scala per seme", "H2x"),
        P("Ogni giocatore può avere una sola scala di Cuori, una di Quadri, una di Fiori e una di Picche. Dopo l'apertura, ogni nuova carta dello stesso seme deve collegarsi alla scala già esistente mantenendo continua la sequenza.", "Bodyx"),
    ]

    s += [PageBreak(), P("4.1 Asso, figure e Re Sovrano", "H1x")]
    s += [
        P("La sequenza è circolare: dopo K viene A e dopo A viene 2. L'Asso può quindi essere basso o alto, purché il collegamento sia reale e consecutivo.", "Bodyx"),
        CardRow([("A", "D"), ("2", "D"), ("3", "D"), ("4", "D")], "Scala Naturale", True),
        Spacer(1, 2 * mm),
        CardRow([("Q", "D"), ("K", "D"), ("A", "D"), ("2", "D")], "Scala Suprema circolare", True),
        P("Re Sovrano fuori sequenza", "H2x"),
        P("Dopo aver calato una combinazione valida di almeno 3 carte puoi aggiungere il Re dello stesso seme fuori dalla sua posizione naturale. Il Re non colma un buco e non permette di aprire direttamente una combinazione, ma può diventare Sovrano anche su una scala Matta già presente sul tavolo.", "Bodyx"),
        CardRow([("3", "H"), ("4", "H"), ("K", "H")], "non valida: il Re non sostituisce il 5", False),
        Spacer(1, 2 * mm),
        CardRow([("3", "H"), ("4", "H"), ("5", "H"), ("K", "H")], "Re Sovrano: 25 punti", True),
        CardRow([("4", "D"), ("5", "X"), ("6", "D"), ("K", "D")], "Re Sovrano Matto: 15 (Jolly = 5)", True),
        P("Il Re Sovrano entra automaticamente nella sequenza naturale quando la scala raggiunge Q-K oppure forma K-A-2-3. Da quel momento la combinazione è Suprema da 50 punti. Prima di allora un Asso non può agganciarsi al solo Re Sovrano se l'altro estremo della scala non lo collega.", "Bodyx"),
        P("Re Umile", "H2x"),
        P("Qualunque K può diventare <b>Re Umile</b> quando viene effettivamente calato come valore mancante del proprio seme, in una nuova combinazione o in una scala già presente. Non dipende dal numero di carte in mano e non richiede una dichiarazione preventiva: la calata indica il valore temporaneamente rappresentato dal K.", "Bodyx"),
        P("Finché è incastonato nella sequenza, il Re Umile non può essere preso o sostituito come un Jolly, non blocca, non partecipa a Duelli, Alleanze o rinforzi e non può condividere la combinazione con un Jolly. La combinazione che lo contiene non può essere bloccata.", "Bodyx"),
        P("Quando arriva la carta naturale rappresentata, essa entra nella posizione corretta e libera il K. Se le carte naturali rimaste formano una combinazione valida, il K diventa Re Sovrano. Con almeno quattro carte naturali oltre al K, finché resta incastonato la Scala di Re Umile vale 10 punti; altrimenti la combinazione incompleta vale 0.", "Bodyx"),
    ]

    s += [PageBreak(), P("5. Bloccare e liberare una scala", "H1x"), BlockDiagram()]
    s += [
        P("Blocco", "H2x"),
        bullet("Devi avere già almeno una tua combinazione valida sul tavolo."),
        bullet("Il bersaglio deve avere 3 carte, oppure 4 carte con almeno un Jolly."),
        bullet("Una scala di 4 carte naturali o di almeno 5 carte è consolidata e non può essere bloccata."),
        bullet("Il bersaglio non deve contenere un Re e non deve essere già stato liberato."),
        bullet("Gioca un Re di seme diverso e disponilo in diagonale <b>/</b>."),
        P("La combinazione bloccata non può essere modificata e infligge <b>-20 punti al suo proprietario</b> finché resta bloccata. La penalità scompare immediatamente quando la scala viene liberata e riclassificata.", "Bodyx"),
        callout("Jolly sotto Blocco", "Finché la scala è bloccata, il Jolly non può essere sostituito né recuperato. Anche possedendo la carta naturale che rappresenta, devi prima liberare la scala. Se quella carta è il K Legittimo, la liberazione passa necessariamente dal Duello.", "gold"),
        P("Duello di Re", "H2x"),
        P("Il Re straniero che impone il blocco è il <b>Re Invasore</b>; quello dello stesso seme della scala è il <b>Re Legittimo</b>. Quando il Legittimo convoca il Duello, entrambi scelgono in segreto una carta dalla propria mano. Il Fato assegna poi una carta dal fondo del mazzo prima all'Invasore e poi al Legittimo; le quattro carte vengono rivelate insieme.", "Bodyx"),
        callout("La scena del Duello", "Il K Legittimo apre una schermata dedicata. Qui si scelgono i rinforzi, il Fato rivela le proprie carte e viene narrato il verdetto. Il tavolo resta sospeso finché entrambi i contendenti non scelgono «Accetta la Sorte».", "gold"),
        Table([
            [P("Carta", "TableHead"), P("Forza", "TableHead"), P("Affinità", "TableHead")],
            [P("2-10", "TableCellBold"), P("Valore nominale", "TableCell"), P("+5 se dello stesso seme del Re", "TableCell")],
            [P("J / Q / A", "TableCellBold"), P("11 / 12 / 15", "TableCell"), P("+5 se dello stesso seme del Re", "TableCell")],
            [P("Jolly / K", "TableCellBold"), P("20 / 0", "TableCell"), P("Il Jolly non ha seme; il K vale sempre 0", "TableCell")],
        ], colWidths=[34 * mm, 48 * mm, 81 * mm], hAlign="LEFT", style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), GREEN),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1eee4")]),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#c9c2b0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 2.2 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2.2 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 1.8 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8 * mm),
        ])),
        PageBreak(),
        P("5.1 Esiti, Prigionieri e Rito", "H1x"),
        P("Esempio di confronto", "H2x"),
        CardRow([("8", "D"), ("Q", "C"), "ARROW", ("A", "C"), ("6", "C")], "Invasore: 8 di Quadri + Q di Fato. Legittimo: A di Fiori + 6 di Fato.", True, height=31 * mm),
        P("Ogni coppia somma il rinforzo scelto e la Carta del Fato. Nell'esempio il Re Invasore di Quadri totalizza 25: 8 di Quadri (8 + 5) e Q di Fiori (12). Il Re Legittimo di Fiori totalizza 31: A di Fiori (15 + 5) e 6 di Fiori (6 + 5). Vince il Legittimo.", "Bodyx"),
        bullet("<b>Vince il Legittimo:</b> cattura l'Invasore, libera la scala, continua il turno e alla fine effettua il normale scarto."),
        bullet("<b>Vince l'Invasore:</b> cattura il Legittimo, mantiene il blocco e termina il turno avversario senza scarto."),
        bullet("<b>Parità:</b> nessuna cattura; il Legittimo torna in mano, il blocco resta e il turno termina senza scarto."),
        P("I rinforzi scelti tornano nelle mani. Le Carte del Fato vengono disperse casualmente nella parte centrale del mazzo. Non si pesca alcuna carta aggiuntiva. Il Duello non può essere convocato se il Re Legittimo è l'unica carta rimasta in mano.", "Bodyx"),
        callout("Alleanza Segreta", "Se il Re Legittimo offre come rinforzo nascosto un altro Re, l'alleato viene rivelato immediatamente: il Duello è vinto senza consultare il Fato. Il Re Invasore diventa Prigioniero e il Re alleato entra nella Corte dei Re, dove resta inutilizzabile fino alla fine della mano.", "gold"),
        callout("Dominio dei Re", "Ogni Re normale controllato in una scala, come Sovrano, come Invasore ancora sul blocco o nella Corte vale +20 punti. Il Re sconfitto resta scoperto come Prigioniero, non può essere giocato e vale +30 punti. I Re ancora in mano non partecipano al Dominio dei Re e conservano la penalità di fine mano.", "green"),
        P("Il Sacrificio e il Rito dei Tre Sigilli", "H2x"),
        P("La liberazione avviene mediante <b>Duello dei Re</b> oppure mediante <b>Sacrificio</b>. Il Sacrificio viene celebrato attraverso il <b>Rito dei Tre Sigilli</b>: il Rito è la procedura del Sacrificio, non un terzo sistema distinto. Il monte degli scarti diventa l'altare in una schermata dedicata. Dopo la scelta e l'offerta dei tre Sigilli, la liberazione viene mostrata a entrambi. Il gioco riprende soltanto quando tutti e due scelgono <b>Accetta il Destino</b>.", "Bodyx"),
        P("Offri agli scarti 3 carte naturali del seme della scala, anche non consecutive; K e Jolly non sono ammessi. Se provengono dalla pesca multipla, almeno una deve essere già stata nella tua mano. Il Re Invasore diventa Prigioniero, la scala è liberata e il turno termina senza altro scarto. Il Rito è infallibile, ma non può svuotare completamente la mano.", "Bodyx"),
        callout("Ordine dei tre doni", "Il primo Sigillo va sul fondo dell'offerta, il secondo al centro e il terzo diventa la nuova carta visibile in cima al monte degli scarti. Prima di confermare il Sacrificio puoi cambiare liberamente l'ordine.", "gold"),
        callout("Eserciti, Fato e Rito", "Nei Quattro Regni le carte dello stesso seme sostengono il proprio Re, il Fato può rovesciare ogni previsione e i Tre Sigilli invocano il giudizio delle antiche potenze.", "green"),
        callout("Segnale cartaceo di immunità", "Il Re bloccante si pone /. Dopo la liberazione, disponi l'ultima carta della scala nella direzione opposta, \\. Questo segnale ricorda che la scala non può essere bloccata di nuovo.", "green"),
    ]

    s += [PageBreak(), P("5.2 Battaglia del Regno Mancante", "H1x")]
    s += [
        P("Quando un giocatore ha aperto tre Regni e non possiede ancora una combinazione nel quarto seme, può tentare di sottrarre all'avversario il confine necessario. La Battaglia è sempre attiva, può essere dichiarata una sola volta per giocatore in ogni mano e si svolge dopo la pesca, prima di qualsiasi altra azione sul tavolo.", "Bodyx"),
        callout("Bersaglio valido", "La scala avversaria deve appartenere al Regno mancante, essere libera, consecutiva e composta da almeno 5 carte naturali. Si conquistano soltanto carte naturali terminali; K, Jolly, Re Umile e carte interne sono esclusi. Dopo il distacco devono restare almeno 3 carte consecutive valide.", "green"),
        P("Alleanze dei Regni", "H2x"),
        P("Cuori e Quadri sono Regni alleati. Fiori e Picche sono Regni alleati. Il K del Regno alleato è il comandante della Battaglia Reale e deve poter tornare, dopo lo scontro, in una combinazione o scala valida del proprio seme.", "Bodyx"),
        P("Battaglia Reale", "H2x"),
        bullet("Richiede il K alleato nella mano e una sua combinazione di ritorno libera."),
        bullet("Il comandante offre un tributo naturale per ciascuno degli altri due Regni già aperti; un K Prigioniero del seme richiesto può sostituire il relativo tributo."),
        bullet("Se il Re Legittimo del Regno difeso è nella mano avversaria o governa la scala bersaglio, nasce un Duello: entrambi scelgono un rinforzo e il Fato assegna le proprie carte."),
        bullet("Se il comandante vince, cattura il Re Legittimo, conquista due carte terminali e torna come Re Sovrano. Se vince il Legittimo, il comandante diventa Prigioniero e nessuna carta è conquistata. In parità entrambi i K tornano disponibili e il confine non cambia."),
        bullet("Se non esiste un Re Legittimo, si conquista una carta terminale senza Duello e il comandante torna come Re Sovrano."),
        P("Incursione", "H2x"),
        P("L'Incursione è ammessa soltanto quando il K alleato non è utilizzabile. Richiede tre tributi naturali, uno per ciascun Regno aperto. Se il Re Legittimo esiste, l'Incursione è respinta automaticamente; altrimenti viene conquistata una sola carta terminale. L'Incursione non genera Duello, catture o Prigionieri.", "Bodyx"),
        P("Tributi, conquista e conclusione", "H2x"),
        P("La carta obbligatoria raccolta dal monte degli scarti può essere offerta come tributo. Dopo i tributi deve restare almeno una carta libera nella mano del comandante. Le carte conquistate entrano nella sua mano, ma non possono essere calate, agganciate o scartate nello stesso turno: saranno disponibili dal turno successivo e non aprono automaticamente il Regno mancante.", "Bodyx"),
        callout("Verdetto", "La Battaglia sostituisce lo scarto ordinario. Dopo l'esito interviene una sola Decisione del Fato. Il tavolo resta sospeso finché entrambi i contendenti non scelgono «Accetta la Sorte».", "gold"),
    ]

    s += [PageBreak(), P("6. Il Jolly", "H1x")]
    s += [
        JokerPair(),
        P("Dichiarazione", "H2x"),
        P("Quando giochi un Jolly dichiara il valore e il seme rappresentati. La dichiarazione deve rendere la sequenza completa e senza doppioni. Una nuova combinazione può contenere un solo Jolly.", "Bodyx"),
        CardRow([("5", "C"), ("6", "C"), ("7", "X")], "Jolly dichiarato 7 di Fiori", True),
        P("Jolly necessario e Jolly libero", "H2x"),
        P("<b>Jolly necessario:</b> senza di lui la scala non sarebbe consecutiva o non avrebbe almeno 4 carte complete. La categoria diventa Matta e perde 10 punti rispetto alla categoria naturale raggiunta.", "Bodyx"),
        P("<b>Jolly libero:</b> è aggiunto a un'estremità e, togliendolo, resta comunque una scala naturale completa. Facilita la chiusura ma vale 0: non aggiunge né sottrae punti. Se una carta viene poi collocata oltre il Jolly e lo rende necessario alla continuità, si applica la penalità di 10 punti.", "Bodyx"),
        P("Per rendere immediata la lettura del tavolo, un Jolly libero viene disposto sempre all'estremità destra della scala. È una convenzione grafica: il valore dichiarato resta indicato accanto alla combinazione.", "Bodyx"),
        callout("Esempio decisivo", "9-10-J-Q più Jolly dichiarato K vale 40: la scala 9-10-J-Q resta Regina completa anche senza il Jolly, quindi il Jolly è libero e vale 0. 6-7-8 più Jolly dichiarato 9 vale 20: senza il Jolly restano soltanto 3 carte, quindi è necessario.", "gold"),
    ]

    s += [PageBreak(), P("6.1 Sostituire e ricalare il Jolly", "H1x")]
    s += [
        P("Puoi sostituire un Jolly presente in una tua scala o in una scala avversaria giocando la carta naturale esatta che esso rappresenta. Puoi farlo anche su una scala già liberata: l'immunità impedisce soltanto un nuovo Blocco.", "Bodyx"),
        CardRow([("7", "S"), ("8", "S"), ("9", "X"), ("10", "S"), "ARROW", ("9", "S")], "il 9 naturale libera il Jolly", True),
        P("La carta naturale prende il posto del Jolly. Il Jolly recuperato entra nella tua mano e deve essere ricalato entro la fine dello stesso turno in una nuova combinazione valida oppure in una tua scala esistente. Non può essere scartato né conservato.", "Bodyx"),
        P("Durante il turno puoi compiere le azioni intermedie necessarie: per esempio usare prima la carta obbligatoria presa dagli scarti, estendere una scala e infine ricalare il Jolly.", "Bodyx"),
        callout("Scambio strategico e annullamento", "Sostituire il Jolly avversario è facoltativo: migliori la sua scala, ma recuperi il Jolly. Se non trovi una destinazione valida per ricalarlo, Annulla ultima mossa ripristina la scala e la tua mano senza bloccare la partita.", "gold"),
        callout("Nessun valore personale da ricordare", "Il Jolly non conserva il valore della scala da cui proviene. Appena recuperato torna completamente libero: nella nuova destinazione dichiari un nuovo valore coerente con quella scala.", "green"),
        P("Jolly in mano a fine mano", "H2x"),
        P("Ogni Jolly rimasto nella mano del giocatore che non chiude vale 30 punti di penalità. Il Jolly può essere scartato normalmente e può essere anche la carta finale di chiusura, salvo l'obbligo di ricalare un Jolly appena recuperato.", "Bodyx"),
    ]

    s += [PageBreak(), P("7. Scarto, Esilio del Re e chiusura", "H1x")]
    s += [
        P("Scarto ordinario", "H2x"),
        P("Con Obbligo di aggancio disattivato puoi scartare qualsiasi carta naturale o Jolly. Con l'opzione attiva, una carta immediatamente agganciabile a una tua scala deve essere usata, salvo le eccezioni anti-stallo e di continuità della mano. In ogni configurazione non puoi scartare la carta scelta dal monte finché non l'hai usata, né il Jolly recuperato finché non lo hai ricalato.", "Bodyx"),
        P("Esilio del Re", "H2x"),
        P("Il K non può essere scartato normalmente. Prima dell'Esilio devono restare disponibili tutti i suoi usi legali. Soltanto alla conclusione del turno, se rimane inutilizzato, può essere conservato o sottoposto all'Esilio di Necessità.", "Bodyx"),
        P("Si può esiliare <b>al massimo un K per turno</b>. Con una mano composta soltanto da più K, il giocatore ne sceglie uno da esiliare e conserva tutti gli altri; non effettua uno scarto personale, interviene la Decisione del Fato e il turno termina.", "Bodyx"),
        P("Con uno o più K e una sola carta non-K, il giocatore può scartare la carta non-K e conservare tutti i K, oppure esiliare un solo K, conservare tutte le altre carte e affidarsi alla Decisione del Fato. Con un solo K e nessuna chiusura valida, il K resta nella mano e interviene il Fato.", "Bodyx"),
        callout("Esilio come scarto finale", "Se il K esiliato è l'ultima carta e tutte le condizioni di chiusura sono soddisfatte, la mano termina regolarmente e assegna il bonus di chiusura di +50 punti.", "gold"),
        P("Regola di Continuità della Mano", "H2x"),
        P("Se al termine delle azioni rimane una sola carta ma le condizioni di chiusura non sono soddisfatte, la carta resta nella mano: non viene scartata e la mano non può diventare vuota. Le azioni già compiute restano valide, interviene la Decisione del Fato e, dopo «Accetta il Destino», il turno termina.", "Bodyx"),
        P("Condizioni di chiusura", "H2x"),
        bullet("Hai aperto una combinazione in tutti e quattro i semi."),
        bullet("Almeno 3 delle tue 4 scale sono complete."),
        bullet("Hai al massimo 1 Scala Bloccata."),
        bullet("L'ultima carta è legalmente scartabile, oppure è un K soggetto all'Esilio del Re."),
        P("Con Obbligo di aggancio disattivato lo scarto finale può essere agganciabile. Con l'opzione attiva valgono l'obbligo e le eccezioni anti-stallo. Il Jolly può essere lo scarto finale; il K conclude soltanto attraverso l'Esilio del Re.", "Bodyx"),
        callout("Pressione progressiva dei Re", "L'Esilio non riduce automaticamente la mano a un solo K e non elimina più Re nello stesso turno. Ogni K conservato mantiene tutte le possibilità strategiche nei turni successivi.", "green"),
        P("Annullamento", "H2x"),
        P("Finché il turno non è terminato, ogni normale azione sul tavolo può essere annullata in ordine inverso. Questa tutela serve a correggere un aggancio o una calata che renderebbe impossibile lo scarto finale.", "Bodyx"),
    ]

    s += [PageBreak(), P("8. Categorie e punteggi", "H1x"), score_table()]
    s += [
        Spacer(1, 3 * mm),
        callout("Regola di classificazione", "Conta la figura naturale più alta realmente presente sul tavolo: la figura dichiarata dal Jolly non eleva la categoria. Il Jolly necessario applica -10. Il Jolly libero vale 0 e conserva la categoria delle carte naturali. Il Re Sovrano vale 25, oppure 15 con Jolly necessario; su una Scala Naturale o Militare aggiunge +5 anche quando è presente un Jolly libero: 35 o 40 punti.", "gold"),
    ]

    s += [PageBreak(), P("8.1 Esempi di stesura", "H1x")]
    examples = [
        ([("6", "H"), ("7", "H"), ("8", "H"), ("9", "H")], "Scala Naturale - 30"),
        ([("8", "S"), ("9", "S"), ("10", "S"), ("J", "S")], "Scala Militare - 35"),
        ([("8", "C"), ("9", "C"), ("10", "C"), ("J", "C"), ("Q", "C")], "Scala Regina - 40"),
        ([("8", "D"), ("9", "D"), ("10", "D"), ("J", "D"), ("Q", "D"), ("K", "D")], "Scala Suprema - 50"),
        ([("2", "S"), ("3", "S"), ("4", "X"), ("5", "S")], "Scala Matta - 20 (Jolly = 4)"),
    ]
    for cards, caption in examples:
        s += [CardRow(cards, caption, True, height=31 * mm), Spacer(1, 2 * mm)]
    s += [
        P("La figura più alta è quella realmente raggiunta nella sequenza. Un Re fuori sequenza non eleva la scala a Suprema. Il Jolly libero viene ignorato nel conteggio: dichiarato J dopo il 10 conserva la Naturale; Q dopo il J conserva la Militare; Re dopo la Q conserva la Regina; Asso dopo un Re naturale conserva la Suprema.", "Bodyx"),
    ]

    s += [PageBreak(), P("8.2 Esempi con il Jolly", "H1x")]
    joker_examples = [
        ([("6", "H"), ("7", "H"), ("8", "H"), ("9", "X")], "Scala Matta - 20 (Jolly = 9)"),
        ([("8", "D"), ("9", "D"), ("10", "X"), ("J", "D")], "Matta Militare - 25 (Jolly = 10)"),
        ([("9", "C"), ("10", "X"), ("J", "C"), ("Q", "C")], "Matta con Regina - 30 (Jolly = 10)"),
        ([("10", "S"), ("J", "X"), ("Q", "S"), ("K", "S")], "Matta col Re - 40 (Jolly = J)"),
        ([("9", "H"), ("10", "H"), ("J", "H"), ("Q", "H"), ("K", "X")], "Regina con Jolly libero - 40 (Jolly = Re)"),
    ]
    for cards, caption in joker_examples:
        s += [CardRow(cards, caption, True, height=31 * mm), Spacer(1, 2 * mm)]
    s += [
        P("Nei primi quattro esempi il Jolly è necessario: togliendolo resterebbero soltanto tre carte oppure un'interruzione nella sequenza. Nell'ultimo esempio 9-10-J-Q è già una Scala Regina completa; il Jolly dichiarato Re è quindi libero, vale 0 e non trasforma la scala in Suprema.", "Bodyx"),
    ]

    s += [PageBreak(), P("9. Conteggio di fine mano", "H1x")]
    s += [
        P("Quando un giocatore chiude, calcola il punteggio di entrambi.", "Bodyx"),
        bullet("Somma il valore finale di ciascuna scala."),
        bullet("Assegna +25 per ogni Dominio ottenuto, fino a un massimo di +100 per i quattro semi."),
        bullet("Assegna +20 per ogni Re normale controllato in una scala, come Sovrano, come Invasore ancora sul blocco o nella Corte dei Re."),
        bullet("Assegna +30 per ogni Re Prigioniero catturato."),
        bullet("Assegna +50 al giocatore che ha chiuso."),
        bullet("Sottrai al giocatore che non ha chiuso le carte rimaste in mano."),
        P("Penalità della mano", "H2x"),
        Table([
            [P("Carta", "TableHead"), P("Penalità", "TableHead")],
            [P("2-10", "TableCellBold"), P("-10 ciascuna", "TableCell")],
            [P("A", "TableCellBold"), P("-15 ciascuno", "TableCell")],
            [P("J, Q, K", "TableCellBold"), P("-20 ciascuna", "TableCell")],
            [P("Jolly", "TableCellBold"), P("-30 ciascuno", "TableCell")],
        ], colWidths=[80 * mm, 50 * mm], hAlign="LEFT", style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), GREEN),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1eee4")]),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c9c2b0")),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ])),
        P("Dominio competitivo", "H2x"),
        P("Per concorrere al Dominio di un seme devi avere almeno 5 carte calate in quel seme. Il bonus va al giocatore che ne ha di più. Se entrambi hanno lo stesso numero, nessuno ottiene il Dominio. Il conteggio è ricalcolato alla chiusura, quindi un 6/5 supera un precedente 5/5.", "Bodyx"),
        callout("Esempio", "Il primo giocatore ha 5 carte di Picche e il secondo ne ha 6: il Dominio di Picche e il bonus +25 spettano al secondo giocatore. Con 5 carte contro 5 il bonus non viene assegnato. Conquistando tutti e quattro i Domini si ottengono +100 punti.", "green"),
    ]

    s += [PageBreak(), P("9.1 Conquiste e vittoria", "H1x")]
    conquest_data = [
        [P("TRAGUARDO", "TableHead"), P("EFFETTO", "TableHead"), P("PRIORITÀ", "TableHead")],
        [P("12 naturali su 13", "TableCellBold"), P("<b>Scala del Regno:</b> 500 punti esatti e vittoria immediata della mano.", "TableCell"), P("Vince il match se il totale raggiunge almeno 1.000.", "TableCell")],
        [P("13 naturali su 13", "TableCellBold"), P("<b>Conquista del Regno:</b> 1.000 punti esatti e vittoria immediata del match.", "TableCell"), P("Non richiede 50 punti di vantaggio.", "TableCell")],
        [P("Vittoria ordinaria", "TableCellBold"), P("Almeno 1.000 punti cumulativi e almeno 50 di vantaggio.", "TableCell"), P("Si verifica dopo il conteggio di una mano.", "TableCell")],
    ]
    table = Table(conquest_data, colWidths=[42 * mm, 72 * mm, 49 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1eee4")]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c9c2b0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.7 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.7 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    s += [
        table,
        Spacer(1, 4 * mm),
        P("I traguardi del Regno contano soltanto carte naturali distinte del seme. Un Jolly non sostituisce la carta mancante ai fini del 12/13 o 13/13.", "Bodyx"),
        callout("Priorità della stessa azione", "Se un'unica azione porta da 11 direttamente a 13 carte naturali, prevale la Conquista del Regno da 1.000 punti. Se l'azione termina a 12, la mano finisce subito con la Scala del Regno da 500 punti e non può proseguire verso la tredicesima carta nella stessa mano.", "gold"),
        P("In entrambi i casi il punteggio speciale sostituisce integralmente il normale conteggio della mano: non si sommano scale, Domini, bonus di chiusura o penalità. La Scala del Regno da 500 punti non conclude automaticamente il match se il totale rimane inferiore a 1.000 punti.", "Bodyx"),
    ]

    s += [
        callout("Dopo il verdetto", "Il tavolo e il riepilogo restano consultabili. Dopo una mano entrambi i contendenti devono scegliere «Nuova Battaglia»; dopo la vittoria del match devono scegliere «Nuovo Dominio». La distribuzione o l'azzeramento avvengono soltanto alla seconda conferma.", "green"),
    ]

    s += [PageBreak(), P("10. Casi limite risolti", "H1x")]
    faq = [
        ("Posso calare 3-4-K dello stesso seme?", "No. Il Re non sostituisce il 5 e non apre direttamente una combinazione. Cala prima una combinazione valida di almeno 3 carte, anche con un Jolly dichiarato; poi puoi aggiungere il Re come Sovrano."),
        ("Posso avere 2-3-4 e, separatamente, 8-9-10 dello stesso seme?", "No. Esiste una sola scala per seme e per giocatore. I due tratti devono essere collegati da tutti i valori intermedi."),
        ("L'Asso si aggancia sempre dopo un Re?", "No. Soltanto dopo un Re nella posizione naturale della sequenza. Non si collega a un Re Sovrano fuori sequenza."),
        ("Un Jolly può andare ovunque?", "Può assumere qualunque valore, ma la dichiarazione deve rendere la sequenza valida e senza doppioni."),
        ("Posso sostituire un Jolly avversario?", "Sì, con la carta naturale esatta, anche se la scala è già liberata. Il Jolly recuperato deve essere ricalato nello stesso turno; se non puoi farlo, annulla la sostituzione."),
        ("Posso scartare una carta agganciabile?", "Dipende dalla configurazione. Con Obbligo di aggancio ON deve essere usata, salvo le eccezioni anti-stallo; con l'opzione OFF le carte non-K sono liberamente scartabili. Il K viene eventualmente deposto nella Terra d'Esilio, mai nel monte degli scarti."),
        ("Il Re sconfitto nel Duello va negli scarti?", "No. Resta scoperto nell'angolo del vincitore come Re Prigioniero, non può essere riutilizzato e vale +30 punti."),
        ("Nel Duello si pescano carte aggiuntive?", "No. Le carte scelte tornano in mano e le due Carte del Fato vengono reinserite nella parte centrale del mazzo."),
        ("Una scala liberata può essere bloccata di nuovo?", "No. Il segnale \\ indica immunità permanente."),
        ("Tre carte valgono punti?", "Una combinazione incompleta vale 0. Se viene bloccata infligge -20 al proprietario; se viene completata da un Re Sovrano vale 25."),
        ("Il Jolly libero vale da solo?", "No. Facilita la chiusura ma vale 0: non aggiunge né sottrae punti alla scala già completa."),
    ]
    for question, answer in faq:
        s += [KeepTogether([P(question, "H3x"), P(answer, "Bodyx")])]

    s += [PageBreak(), P("10.1 Sequenze operative senza stallo", "H1x")]
    s += [
        P("Caso A - carta scelta dagli scarti e Jolly", "H2x"),
        P("Prendi 8 di Fiori in profondità insieme ad altre carte. Puoi prima sostituire un Jolly, poi ricalare il Jolly recuperato e infine usare l'8 di Fiori. L'obbligo è soddisfatto perché l'8 viene usato entro il turno.", "Bodyx"),
        P("Caso B - due carte entrambe agganciabili", "H2x"),
        P("Se ti restano 6 di Cuori e 9 di Fiori ed entrambe proseguono le tue scale, con Obbligo di aggancio OFF puoi scartarne una normalmente. Con l'opzione ON devi agganciare quando possibile, salvo che l'eccezione anti-stallo sia necessaria per consentire la prosecuzione legale della mano.", "Bodyx"),
        P("Caso C - ultima carta K o Jolly", "H2x"),
        P("Il Jolly può essere lo scarto finale. Il K non è scartabile normalmente: se è l'unica carta rimasta e le condizioni di chiusura sono soddisfatte, viene esiliato e assegna comunque +50 per la chiusura.", "Bodyx"),
        P("Caso D - tutte le carte sembrano calabili", "H2x"),
        P("Con Obbligo di aggancio OFF puoi scegliere quale carta non-K offrire agli scarti anche se sarebbe agganciabile. Con l'opzione ON devi prima rispettare l'obbligo, salvo le eccezioni anti-stallo. Se restano soltanto K si applica l'Esilio del Re.", "Bodyx"),
        P("Caso E - mazzo esaurito", "H2x"),
        P("Rimescola il monte lasciando scoperta soltanto la carta superiore. Nessuna carta viene duplicata o eliminata e la mano prosegue.", "Bodyx"),
        callout("Regola generale", "Ogni turno deve concludersi con uno scarto ordinario oppure con una conclusione speciale prevista. Ogni obbligo temporaneo deve essere risolto entro il turno; ogni stato speciale sul tavolo deve essere riconoscibile attraverso il Re /, la carta di liberazione \\ o la dichiarazione del Jolly.", "green"),
    ]

    s += [PageBreak(), P("11. Consultazione rapida", "H1x"), quick_table()]
    s += [
        Spacer(1, 5 * mm),
        P("Ordine delle priorità", "H2x"),
        bullet("<b>1.</b> Conquista del Regno 13/13, se raggiunta nella stessa azione."),
        bullet("<b>2.</b> Scala del Regno 12/13 e conclusione della mano."),
        bullet("<b>3.</b> Chiusura ordinaria e conteggio della mano."),
        bullet("<b>4.</b> Vittoria ordinaria a 1.000 punti con 50 di vantaggio."),
        Spacer(1, 4 * mm),
        callout("Promemoria del tavolo", "Re avversario / = scala bloccata. Ultima carta \\ = scala liberata e immune. Jolly = valore e seme sempre dichiarati. Nessuna seconda scala dello stesso seme.", "gold"),
    ]

    s += [PageBreak(), Spacer(1, 27 * mm)]
    s += [
        Image(str(LOGO), width=55 * mm, height=55 * mm, hAlign="CENTER"),
        Spacer(1, 8 * mm),
        P("LA SCALA DEI QUATTRO REGNI", "BookTitle"),
        P("Quattro semi. Due contendenti. Un solo dominio.", "Quote"),
        Spacer(1, 5 * mm),
        P("Regolamento ufficiale", "Subtitle"),
        Spacer(1, 20 * mm),
        callout("Nota editoriale", "Questa edizione è stata verificata rispetto al motore ufficiale del gioco. Le formulazioni sono state uniformate per eliminare ambiguità tra uso immediato ed entro il turno, Re Sovrano e Re naturale, Jolly necessario e Jolly libero, Dominio e Conquiste.", "green"),
        Spacer(1, 9 * mm),
        P("Che la strategia guidi la tua mano e che il fato scelga il destino dei Regni.", "Quote"),
    ]
    return s


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="La Scala dei Quattro Regni - Regolamento Ufficiale",
        author="La Scala dei Quattro Regni",
        subject="Regolamento ufficiale del gioco",
    )
    cover_frame = Frame(0, 0, PAGE_W, PAGE_H, id="cover", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    body_frame = Frame(
        MARGIN_X, MARGIN_BOTTOM, PAGE_W - 2 * MARGIN_X, PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
        id="body", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    doc.addPageTemplates([
        PageTemplate(id="Cover", frames=[cover_frame], onPage=cover_page, autoNextPageTemplate="Body"),
        PageTemplate(id="Body", frames=[body_frame], onPage=content_page),
    ])
    doc.build(build_story(), canvasmaker=NumberedCanvas)
    print(OUTPUT)


if __name__ == "__main__":
    main()
