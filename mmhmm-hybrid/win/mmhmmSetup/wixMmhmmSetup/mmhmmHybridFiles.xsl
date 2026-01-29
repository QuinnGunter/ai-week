<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:wi="http://wixtoolset.org/schemas/v4/wxs" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns="http://wixtoolset.org/schemas/v4/wxs"
  exclude-result-prefixes="wi">
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>
  <!-- Copy everything -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>
  <!-- Apply filters: -->
  <!-- remove .pdb files Components -->
  <xsl:template match="wi:Component[wi:File[substring(@Source, string-length(@Source) - string-length('.pdb') + 1) = '.pdb']]"/>
    <!-- remove .log files Components -->
  <xsl:template match="wi:Component[wi:File[substring(@Source, string-length(@Source) - string-length('.log') + 1) = '.log']]"/>
  <!-- find Component containig our executable, set its file id-->
  <xsl:template match="//wi:File[substring(@Source, string-length(@Source) - string-length('Airtime.exe') + 1) = 'Airtime.exe']/@Id" >
    <xsl:attribute name="Id">
      <xsl:value-of select="'mmhmmExecutableId'"/>
    </xsl:attribute>
  </xsl:template>
</xsl:stylesheet>
