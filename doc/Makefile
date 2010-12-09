ROOT = artigo
LATEX = pdflatex#xelatex#pdflatex

all:
	$(LATEX) $(ROOT)
	bibtex $(ROOT)
	bibtex $(ROOT)
	$(LATEX) $(ROOT)
	$(LATEX) $(ROOT)
	$(LATEX) $(ROOT)

clean:
	rm -rf *~ *.aux *.dvi *.bbl *.blg *.log *.pdf *.lot *.lof *.toc
