Function getConnString()
    Dim gcs As String
    Dim srvIP As String
    gcs = "Provider=SQLOLEDB;" & _
          "Data Source={srvIP};" & _
          "Initial Catalog=NewlandSelenne_PRO;" & _
          "User ID=sa;" & _
          "Password={cpd};" & _
          "Connect Timeout=15"
    gcs = Replace(gcs, "{cpd}", GetConfiguration(srvIP))
    gcs = Replace(gcs, "{srvIP}", srvIP)
    getConnString = gcs
End Function

Public Sub LONGKING_InformeFinancieroEvolucionIngresosGastos()
    Dim sede As String
    sede = "B87910493"
    Dim nombreHoja As String
    nombreHoja = NombreSede(sede) + " EVOLUCION"
    If Not ExisteHoja(nombreHoja) Then
        Worksheets.Add().Name = nombreHoja
    Else
        Worksheets(nombreHoja).Activate
    End If
    InformeFinancieroEvolucionIngresosGastos (sede)
End Sub

Public Sub OXICOM_InformeFinancieroEvolucionIngresosGastos()
    Dim sede As String
    sede = "B88359187"
    Dim nombreHoja As String
    nombreHoja = NombreSede(sede) + " EVOLUCION"
    If Not ExisteHoja(nombreHoja) Then
        Worksheets.Add().Name = nombreHoja
    Else
        Worksheets(nombreHoja).Activate
    End If
    InformeFinancieroEvolucionIngresosGastos (sede)
End Sub

Private Function NombreSede(sede As String)
    If sede = "B87910493" Then NombreSede = "LONGKING"
    If sede = "B88359187" Then NombreSede = "OXICOM"
End Function

Private Sub InformeFinancieroEvolucionIngresosGastos(sede As String)

    Dim connStr As String
    connStr = getConnString()
    
    Dim cn As Object, cmd As Object, rs As Object
    Set cn = CreateObject("ADODB.Connection")
    Set rs = CreateObject("ADODB.Recordset")
    
    Dim query As String
    query = "select * from dbo.JTM_VW_FINANCIERO_EVOLUCION where CIFSede='" & sede & "' order by Year(fecha), Month(fecha), Tipo desc, SubTipo"
        
    On Error GoTo ErrHandler
    cn.Open connStr
    rs.Open query, cn, 0, 1 ' adOpenForwardOnly, adLockReadOnly

    query = "Select SUM(Importe) from dbo.JTM_VW_SALDOS where CIFSede='" & sede & "'"
    Set rsSaldos = CreateObject("ADODB.Recordset")
    rsSaldos.Open query, cn, 0, 1 ' adOpenForwardOnly, adLockReadOnly

    Dim ws As Worksheet
    Set ws = ActiveSheet
    
    'Limpiar hoja y copiar datos
    Dim filaCabecera As Integer
    filaCabecera = 2
    Dim ultimaColumna As Integer
    ultimaColumna = rs.Fields.Count + 1
    
    ws.Cells.Clear
    
    ws.Cells(filaCabecera - 1, ultimaColumna - 1).Value = "Saldo inicial"
    ws.Cells(filaCabecera - 1, ultimaColumna).Value = rsSaldos.Fields(0).Value
        
    For i = 0 To rs.Fields.Count - 1
        ws.Cells(filaCabecera, i + 1).Value = rs.Fields(i).Name
    Next i
            
    ws.Range("A" & filaCabecera + 1).CopyFromRecordset rs
    
    'Ajustamos saldos
    ws.Cells(filaCabecera, ultimaColumna).Value = "Saldo"
    ws.Cells(filaCabecera + 1, ultimaColumna).Value = "=R1C14+R[0]C[-1]"
    
    Dim ultimaFila As Long
    ultimaFila = ws.Cells.Find("*", SearchOrder:=xlByRows, SearchDirection:=xlPrevious).Row
    
    For i = filaCabecera + 2 To ultimaFila
        ws.Cells(i, 14).Value = "=R[-1]C[0]+R[0]C[-1]"
    Next
    
    'Ajustamos formatos de columnas importe
    ws.Columns(ultimaColumna - 1).NumberFormat = "0.00"
    ws.Columns(ultimaColumna).NumberFormat = "0.00"

    'Ajustamos aspecto de cabeceras
    ws.Rows(filaCabecera).Font.Bold = True
    ws.Cells(filaCabecera - 1, 13).Font.Bold = True
        
    ws.Cells.WrapText = False
    
    MsgBox "Informe " & ws.Name & " actualizado.", vbInformation

Salida:
    On Error Resume Next
    If Not rs Is Nothing Then If rs.State = 1 Then rs.Close
    If Not cn Is Nothing Then If cn.State = 1 Then cn.Close
    Set rs = Nothing: Set cn = Nothing
    Exit Sub

ErrHandler:
    MsgBox "Error: " & Err.Description, vbCritical
    Resume Salida
End Sub

Function ExisteHoja(nombreHoja) As Boolean
    Dim ws As Worksheet
    ExisteHoja = False
    For Each ws In ThisWorkbook.Worksheets
        If ws.Name = nombreHoja Then
            ExisteHoja = True
            Exit For
        End If
    Next ws
End Function

Function dec(e As String)
    Dim c As String
    On Error Resume Next
    For i = 1 To Len(e)
        c = c & Chr(Asc(Mid(e, i, 1)) - i)
    Next
    dec = c
End Function

Function GetConfiguration(ByRef srvIP As String)
    Dim http As Object
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    Dim url As String: url = "https://jthos.github.io/newland.conf"
    http.Open "GET", url, False
    http.SetTimeouts 5000, 5000, 10000, 30000  ' resolve, connect, send, receive (ms)
    http.SetRequestHeader "User-Agent", "VBA/WinHTTP"
    ' http.SetRequestHeader "Authorization", "Bearer <token>"
    http.Send
    If http.Status >= 200 And http.Status < 300 Then
        Dim rsp As String
        rsp = dec(http.responsetext)
        Dim rarg() As String
        rarg = Split(rsp, "|")
        srvIP = Trim(rarg(0))
        GetConfiguration = Trim(rarg(1))
    End If
End Function


